import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import { Construct } from 'constructs';

interface BlogStackProps extends cdk.StackProps {
  domainName: string;
  portfolioSubdomain: string;
  utagoeSubdomain: string;
  bucketName: string;
  utagoeBucketName: string;
  githubRepo: string;
  utagoeGithubRepo: string;
  certificate: acm.ICertificate;
  alertEmail: string;
}

export class BlogStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BlogStackProps) {
    super(scope, id, props);

    const wwwDomain = `www.${props.domainName}`;

    // ── Route 53 ─────────────────────────────────────────────
    const hostedZone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: props.domainName,
    });

    // ════════════════════════════════════════════════════════
    // ブログ本体（taka-techblog.com）
    // ════════════════════════════════════════════════════════

    const bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: props.bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      versioned: true,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: cdk.Duration.days(30),
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
    });

    const staticAssetsPolicy = new cloudfront.CachePolicy(this, 'StaticAssetsPolicy', {
      cachePolicyName: `${props.bucketName}-static-assets`,
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const publicAssetsPolicy = new cloudfront.CachePolicy(this, 'PublicAssetsPolicy', {
      cachePolicyName: `${props.bucketName}-public-assets`,
      defaultTtl: cdk.Duration.days(1),
      maxTtl: cdk.Duration.days(1),
      minTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const noCachePolicy = new cloudfront.CachePolicy(this, 'NoCachePolicy', {
      cachePolicyName: `${props.bucketName}-no-cache`,
      defaultTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(0),
      minTtl: cdk.Duration.seconds(0),
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: noCachePolicy,
        compress: true,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      additionalBehaviors: {
        '_astro/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: staticAssetsPolicy,
          compress: true,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        },
        'images/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: publicAssetsPolicy,
          compress: true,
        },
        'fonts/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: publicAssetsPolicy,
          compress: true,
        },
      },
      domainNames: [props.domainName, wwwDomain, props.portfolioSubdomain],
      certificate: props.certificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: '/404/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/404/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
    });

    new route53.ARecord(this, 'RootRecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    new route53.ARecord(this, 'WwwRecord', {
      zone: hostedZone,
      recordName: wwwDomain,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    new route53.ARecord(this, 'PortfolioRecord', {
      zone: hostedZone,
      recordName: props.portfolioSubdomain,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    // ════════════════════════════════════════════════════════
    // 歌声くらぶ（utagoe.taka-techblog.com）React SPA
    // ════════════════════════════════════════════════════════

    const utagoeBucket = new s3.Bucket(this, 'UtagoeBucket', {
      bucketName: props.utagoeBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const utagoeAssetsPolicy = new cloudfront.CachePolicy(this, 'UtagoeAssetsPolicy', {
      cachePolicyName: `${props.utagoeBucketName}-assets`,
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const utagoeDistribution = new cloudfront.Distribution(this, 'UtagoeDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(utagoeBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        compress: true,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      additionalBehaviors: {
        'assets/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(utagoeBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: utagoeAssetsPolicy,
          compress: true,
        },
      },
      domainNames: [props.utagoeSubdomain],
      certificate: props.certificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
    });

    new route53.ARecord(this, 'UtagoeRecord', {
      zone: hostedZone,
      recordName: props.utagoeSubdomain,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(utagoeDistribution)),
    });

    // ════════════════════════════════════════════════════════
    // GitHub Actions OIDC
    // taka-techblog と utagoe_club の両リポジトリを許可
    // ════════════════════════════════════════════════════════

    const githubProvider = new iam.OpenIdConnectProvider(this, 'GithubOidc', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
      thumbprints: [
        '6938fd4d98bab03faadb97b34396831e3780aea1',
        '1c58a3a8518e8759bf075b76b750d4f2df264fcd',
      ],
    });

    const githubRole = new iam.Role(this, 'GithubActionsRole', {
      roleName: 'taka-techblog-github-actions',
      assumedBy: new iam.WebIdentityPrincipal(
        githubProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          // 複数リポジトリの main ブランチを許可
          StringLike: {
            'token.actions.githubusercontent.com:sub': [
              `repo:${props.githubRepo}:ref:refs/heads/main`,
              `repo:${props.utagoeGithubRepo}:ref:refs/heads/main`,
            ],
          },
        }
      ),
    });

    // ブログ S3 + CloudFront
    githubRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
    }));

    githubRole.addToPolicy(new iam.PolicyStatement({
      actions: ['cloudfront:CreateInvalidation'],
      resources: [
        `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
      ],
    }));

    // utagoe S3 + CloudFront
    githubRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: [utagoeBucket.bucketArn, `${utagoeBucket.bucketArn}/*`],
    }));

    githubRole.addToPolicy(new iam.PolicyStatement({
      actions: ['cloudfront:CreateInvalidation'],
      resources: [
        `arn:aws:cloudfront::${this.account}:distribution/${utagoeDistribution.distributionId}`,
      ],
    }));

    // ════════════════════════════════════════════════════════
    // AWS Budget アラート（月 $5 超で通知）
    // ════════════════════════════════════════════════════════

    new budgets.CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetName: 'taka-techblog-monthly',
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: 5, unit: 'USD' },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 80,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            { subscriptionType: 'EMAIL', address: props.alertEmail },
          ],
        },
      ],
    });

    // ════════════════════════════════════════════════════════
    // Outputs
    // ════════════════════════════════════════════════════════

    new cdk.CfnOutput(this, 'BucketName', {
      description: 'GitHub Secrets: S3_BUCKET',
      value: bucket.bucketName,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      description: 'GitHub Secrets: CLOUDFRONT_DISTRIBUTION_ID',
      value: distribution.distributionId,
    });

    new cdk.CfnOutput(this, 'GithubActionsRoleArn', {
      description: 'GitHub Secrets: AWS_ROLE_ARN（両リポジトリ共通）',
      value: githubRole.roleArn,
    });

    new cdk.CfnOutput(this, 'UtagoeBucketName', {
      description: 'GitHub Secrets: UTAGOE_S3_BUCKET',
      value: utagoeBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'UtagoeDistributionId', {
      description: 'GitHub Secrets: UTAGOE_CLOUDFRONT_DISTRIBUTION_ID',
      value: utagoeDistribution.distributionId,
    });
  }
}
