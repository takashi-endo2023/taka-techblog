terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.45"
    }
  }
  required_version = ">= 1.7"
}

# デフォルトリージョン（ap-northeast-1）
provider "aws" {
  region = var.aws_region
}

# ⚠️ ACM証明書は必ず us-east-1 で作成（CloudFront の制約）
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# ── Route 53 ホストゾーン（既存を参照）────────────────────────
data "aws_route53_zone" "main" {
  zone_id = var.route53_zone_id
}

# ── S3 バケット（プライベート）────────────────────────────────
resource "aws_s3_bucket" "blog" {
  bucket = var.bucket_name

  tags = {
    Project = var.project_name
  }
}

resource "aws_s3_bucket_public_access_block" "blog" {
  bucket = aws_s3_bucket.blog.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront OAC からの GetObject のみ許可
resource "aws_s3_bucket_policy" "blog" {
  bucket = aws_s3_bucket.blog.id
  policy = data.aws_iam_policy_document.s3_cloudfront_oac.json

  depends_on = [aws_s3_bucket_public_access_block.blog]
}

data "aws_iam_policy_document" "s3_cloudfront_oac" {
  statement {
    sid    = "AllowCloudFrontServicePrincipal"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.blog.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.blog.arn]
    }
  }
}

# ── CloudFront OAC ─────────────────────────────────────────────
resource "aws_cloudfront_origin_access_control" "blog" {
  name                              = "${var.bucket_name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ── CloudFront キャッシュポリシー ─────────────────────────────
# 静的アセット（_astro/*）用：1年間キャッシュ
resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${var.project_name}-static-assets"
  default_ttl = 31536000
  max_ttl     = 31536000
  min_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}

# HTML用：no-cache
resource "aws_cloudfront_cache_policy" "no_cache" {
  name        = "${var.project_name}-no-cache"
  default_ttl = 0
  max_ttl     = 0
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}

# ── CloudFront ディストリビューション ─────────────────────────
resource "aws_cloudfront_distribution" "blog" {
  enabled             = true
  default_root_object = "index.html"
  aliases             = [var.domain_name, var.portfolio_subdomain]
  price_class         = "PriceClass_200"  # 北米・欧州・アジア

  origin {
    domain_name              = aws_s3_bucket.blog.bucket_regional_domain_name
    origin_id                = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.blog.id
  }

  # _astro/* → immutable キャッシュ（1年間）
  ordered_cache_behavior {
    path_pattern           = "_astro/*"
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.static_assets.id
  }

  # public/* → 1日キャッシュ（画像・フォント）
  ordered_cache_behavior {
    path_pattern           = "public/*"
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.static_assets.id
  }

  # デフォルト（HTML）→ no-cache
  default_cache_behavior {
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.no_cache.id
  }

  # SPA: 404 → /index.html にフォールバック（Astro directory形式）
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.blog.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Project = var.project_name
  }
}

# ── ACM 証明書（us-east-1 必須）────────────────────────────────
resource "aws_acm_certificate" "blog" {
  provider = aws.us_east_1

  # ワイルドカード証明書でサブドメインを一括カバー
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Project = var.project_name
  }
}

# ACM DNS 検証レコード（Route 53 に自動追加）
resource "aws_route53_record" "acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.blog.domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "blog" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.blog.arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}

# ── Route 53 レコード ───────────────────────────────────────────
# メインドメイン → CloudFront
resource "aws_route53_record" "blog" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.blog.domain_name
    zone_id                = aws_cloudfront_distribution.blog.hosted_zone_id
    evaluate_target_health = false
  }
}

# サブドメイン（portfolio.yourname.com）→ 同じ CloudFront
resource "aws_route53_record" "portfolio_subdomain" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.portfolio_subdomain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.blog.domain_name
    zone_id                = aws_cloudfront_distribution.blog.hosted_zone_id
    evaluate_target_health = false
  }
}
