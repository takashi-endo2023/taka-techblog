output "s3_bucket_name" {
  description = "S3バケット名（GitHub Secrets: S3_BUCKET に設定）"
  value       = aws_s3_bucket.blog.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFrontディストリビューションID（GitHub Secrets: CLOUDFRONT_DISTRIBUTION_ID に設定）"
  value       = aws_cloudfront_distribution.blog.id
}

output "cloudfront_domain_name" {
  description = "CloudFrontドメイン名"
  value       = aws_cloudfront_distribution.blog.domain_name
}

output "github_actions_role_arn" {
  description = "GitHub Actions OIDC用IAMロールARN（GitHub Secrets: AWS_ROLE_ARN に設定）"
  value       = aws_iam_role.github_actions.arn
}

output "acm_certificate_arn" {
  description = "ACM証明書ARN（DNS検証が完了してからCloudFrontが有効化される）"
  value       = aws_acm_certificate.blog.arn
}

output "nameservers" {
  description = "Route 53 ネームサーバー（ドメインレジストラで設定する）"
  value       = data.aws_route53_zone.main.name_servers
}
