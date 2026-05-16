variable "aws_region" {
  description = "デフォルトリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "プロジェクト名（リソース名のプレフィックスに使用）"
  type        = string
}

variable "domain_name" {
  description = "メインドメイン名（例: yourname.com）"
  type        = string
}

variable "portfolio_subdomain" {
  description = "ポートフォリオサブドメイン（例: portfolio.yourname.com）"
  type        = string
}

variable "bucket_name" {
  description = "S3バケット名（グローバルで一意）"
  type        = string
}

variable "route53_zone_id" {
  description = "Route 53 ホストゾーン ID"
  type        = string
}

variable "github_repo" {
  description = "GitHub リポジトリ（例: yourname/engineer-blog）"
  type        = string
}
