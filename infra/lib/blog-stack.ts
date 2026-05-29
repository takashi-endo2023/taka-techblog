import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as lambda_ from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

interface BlogStackProps extends cdk.StackProps {
  domainName: string;
  portfolioSubdomain: string;
  utagoeSubdomain: string;
  ecSubdomain: string;
  aiAdsSubdomain: string;
  gameSubdomain: string;
  salarySubdomain: string;
  salaryBucketName: string;
  salaryGithubRepo: string;
  bucketName: string;
  utagoeBucketName: string;
  ecBucketName: string;
  aiAdsBucketName: string;
  gameBucketName: string;
  githubRepo: string;
  utagoeGithubRepo: string;
  ecGithubRepo: string;
  aiAdsGithubRepo: string;
  gameGithubRepo: string;
  aiAdsLambdaName: string;
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
    // CloudFront Function: /path → /path/index.html 変換
    // ════════════════════════════════════════════════════════

    const rewriteFunction = new cloudfront.Function(this, 'RewriteFunction', {
      functionName: 'taka-techblog-rewrite-index',
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }
  return request;
}
      `),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
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
      enableAcceptEncodingGzip: false,
      enableAcceptEncodingBrotli: false,
    });

    // ── カスタムセキュリティヘッダー（ブログ本体用）─────────────
    // CSP: script は self + GTM のみ（unsafe-inline 排除）
    // HSTS: includeSubDomains + preload（2年）
    // COOP: same-origin でポップアップ経由の情報漏洩を防止
    const csp = [
      "default-src 'self'",
      "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com https://www.googletagservices.com https://adservice.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com https://bat.bing.com https://*.a8.net https://*.googlesyndication.com https://*.g.doubleclick.net https://*.google.com https://*.adtrafficquality.google",
      "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.googletagmanager.com https://pagead2.googlesyndication.com https://*.g.doubleclick.net https://*.google.com https://*.adtrafficquality.google",
      "font-src 'self'",
      "worker-src 'self'",
      "frame-src https://docs.google.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://*.adtrafficquality.google",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; ');

    const blogResponseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      'BlogResponseHeadersPolicy',
      {
        responseHeadersPolicyName: `${props.bucketName}-security`,
        securityHeadersBehavior: {
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.days(730), // 2 years
            includeSubdomains: true,
            preload: true,
            override: true,
          },
          xssProtection: { protection: true, modeBlock: true, override: true },
          contentSecurityPolicy: {
            contentSecurityPolicy: csp,
            override: true,
          },
        },
        customHeadersBehavior: {
          customHeaders: [
            {
              header: 'Cross-Origin-Opener-Policy',
              value: 'same-origin',
              override: true,
            },
            {
              header: 'Permissions-Policy',
              value: 'camera=(), microphone=(), geolocation=()',
              override: true,
            },
          ],
        },
      }
    );

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: noCachePolicy,
        compress: true,
        responseHeadersPolicy: blogResponseHeadersPolicy,
        functionAssociations: [{
          function: rewriteFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
      },
      additionalBehaviors: {
        '_astro/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: staticAssetsPolicy,
          compress: true,
          responseHeadersPolicy: blogResponseHeadersPolicy,
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
    // EC サイト（ec.taka-techblog.com）React SPA
    // ════════════════════════════════════════════════════════

    const ecBucket = new s3.Bucket(this, 'EcBucket', {
      bucketName: props.ecBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const ecAssetsPolicy = new cloudfront.CachePolicy(this, 'EcAssetsPolicy', {
      cachePolicyName: `${props.ecBucketName}-assets`,
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const ecDistribution = new cloudfront.Distribution(this, 'EcDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(ecBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        compress: true,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      additionalBehaviors: {
        'assets/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(ecBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: ecAssetsPolicy,
          compress: true,
        },
      },
      domainNames: [props.ecSubdomain],
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

    new route53.ARecord(this, 'EcRecord', {
      zone: hostedZone,
      recordName: props.ecSubdomain,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(ecDistribution)),
    });

    // ════════════════════════════════════════════════════════
    // Game Portfolio（game.taka-techblog.com）Next.js SPA
    // ════════════════════════════════════════════════════════

    const gameBucket = new s3.Bucket(this, 'GameBucket', {
      bucketName: props.gameBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const gameAssetsPolicy = new cloudfront.CachePolicy(this, 'GameAssetsPolicy', {
      cachePolicyName: `${props.gameBucketName}-assets`,
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const gameDistribution = new cloudfront.Distribution(this, 'GameDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(gameBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        compress: true,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      additionalBehaviors: {
        '_next/static/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(gameBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: gameAssetsPolicy,
          compress: true,
        },
      },
      domainNames: [props.gameSubdomain],
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

    new route53.ARecord(this, 'GameRecord', {
      zone: hostedZone,
      recordName: props.gameSubdomain,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(gameDistribution)),
    });

    // ════════════════════════════════════════════════════════
    // 年収トラッカー（salary.taka-techblog.com）React SPA
    // ════════════════════════════════════════════════════════

    const salaryBucket = new s3.Bucket(this, 'SalaryBucket', {
      bucketName: props.salaryBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const salaryAssetsPolicy = new cloudfront.CachePolicy(this, 'SalaryAssetsPolicy', {
      cachePolicyName: `${props.salaryBucketName}-assets`,
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const salaryDistribution = new cloudfront.Distribution(this, 'SalaryDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(salaryBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        compress: true,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      additionalBehaviors: {
        'assets/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(salaryBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: salaryAssetsPolicy,
          compress: true,
        },
      },
      domainNames: [props.salarySubdomain],
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

    new route53.ARecord(this, 'SalaryRecord', {
      zone: hostedZone,
      recordName: props.salarySubdomain,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(salaryDistribution)),
    });

    // ════════════════════════════════════════════════════════
    // AI Ads Dashboard Frontend（ai-ads.taka-techblog.com）
    // ════════════════════════════════════════════════════════

    const aiAdsBucket = new s3.Bucket(this, 'AiAdsBucket', {
      bucketName: props.aiAdsBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const aiAdsAssetsPolicy = new cloudfront.CachePolicy(this, 'AiAdsAssetsPolicy', {
      cachePolicyName: `${props.aiAdsBucketName}-assets`,
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const aiAdsDistribution = new cloudfront.Distribution(this, 'AiAdsDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(aiAdsBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        compress: true,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      additionalBehaviors: {
        '_next/static/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(aiAdsBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: aiAdsAssetsPolicy,
          compress: true,
        },
      },
      domainNames: [props.aiAdsSubdomain],
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

    new route53.ARecord(this, 'AiAdsRecord', {
      zone: hostedZone,
      recordName: props.aiAdsSubdomain,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(aiAdsDistribution)),
    });

    // ════════════════════════════════════════════════════════
    // AI Ads Dashboard Backend（NestJS on Lambda + API Gateway）
    // ════════════════════════════════════════════════════════

    const aiAdsLambda = new lambda_.Function(this, 'AiAdsLambda', {
      functionName: props.aiAdsLambdaName,
      runtime: lambda_.Runtime.NODEJS_20_X,
      handler: 'lambda.handler',
      code: lambda_.Code.fromInline(
        'exports.handler = async () => ({ statusCode: 200, body: "initializing" });'
      ),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const aiAdsApi = new apigateway.LambdaRestApi(this, 'AiAdsApi', {
      handler: aiAdsLambda,
      restApiName: 'ai-ads-dashboard-api',
      proxy: true,
      defaultCorsPreflightOptions: {
        allowOrigins: [`https://${props.aiAdsSubdomain}`],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // ════════════════════════════════════════════════════════
    // GitHub Actions OIDC
    // taka-techblog / utagoe_club / ec の3リポジトリを許可
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
              `repo:${props.ecGithubRepo}:ref:refs/heads/main`,
              `repo:${props.aiAdsGithubRepo}:ref:refs/heads/main`,
              `repo:${props.gameGithubRepo}:ref:refs/heads/main`,
              `repo:${props.salaryGithubRepo}:ref:refs/heads/main`,
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

    // EC S3 + CloudFront
    githubRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: [ecBucket.bucketArn, `${ecBucket.bucketArn}/*`],
    }));

    githubRole.addToPolicy(new iam.PolicyStatement({
      actions: ['cloudfront:CreateInvalidation'],
      resources: [
        `arn:aws:cloudfront::${this.account}:distribution/${ecDistribution.distributionId}`,
      ],
    }));

    // AI Ads S3 + CloudFront + Lambda
    githubRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: [aiAdsBucket.bucketArn, `${aiAdsBucket.bucketArn}/*`],
    }));

    githubRole.addToPolicy(new iam.PolicyStatement({
      actions: ['cloudfront:CreateInvalidation'],
      resources: [
        `arn:aws:cloudfront::${this.account}:distribution/${aiAdsDistribution.distributionId}`,
      ],
    }));

    githubRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'lambda:UpdateFunctionCode',
        'lambda:UpdateFunctionConfiguration',
        'lambda:GetFunctionConfiguration',
      ],
      resources: [aiAdsLambda.functionArn],
    }));

    // Game Portfolio S3 + CloudFront
    githubRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: [gameBucket.bucketArn, `${gameBucket.bucketArn}/*`],
    }));

    githubRole.addToPolicy(new iam.PolicyStatement({
      actions: ['cloudfront:CreateInvalidation'],
      resources: [
        `arn:aws:cloudfront::${this.account}:distribution/${gameDistribution.distributionId}`,
      ],
    }));

    // Salary Tracker S3 + CloudFront
    githubRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: [salaryBucket.bucketArn, `${salaryBucket.bucketArn}/*`],
    }));

    githubRole.addToPolicy(new iam.PolicyStatement({
      actions: ['cloudfront:CreateInvalidation'],
      resources: [
        `arn:aws:cloudfront::${this.account}:distribution/${salaryDistribution.distributionId}`,
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

    new cdk.CfnOutput(this, 'EcBucketName', {
      description: 'GitHub Secrets: EC_S3_BUCKET',
      value: ecBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'EcDistributionId', {
      description: 'GitHub Secrets: EC_CLOUDFRONT_DISTRIBUTION_ID',
      value: ecDistribution.distributionId,
    });

    new cdk.CfnOutput(this, 'AiAdsBucketName', {
      description: 'GitHub Secrets: AI_ADS_S3_BUCKET',
      value: aiAdsBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'AiAdsDistributionId', {
      description: 'GitHub Secrets: AI_ADS_CLOUDFRONT_DISTRIBUTION_ID',
      value: aiAdsDistribution.distributionId,
    });

    new cdk.CfnOutput(this, 'AiAdsApiUrl', {
      description: 'GitHub Secrets: AI_ADS_API_URL（NEXT_PUBLIC_API_URLに設定）',
      value: aiAdsApi.url.replace(/\/$/, ''),
    });

    new cdk.CfnOutput(this, 'AiAdsLambdaArn', {
      description: 'AI Ads Lambda ARN',
      value: aiAdsLambda.functionArn,
    });

    new cdk.CfnOutput(this, 'GameBucketName', {
      description: 'GitHub Secrets: GAME_S3_BUCKET',
      value: gameBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'GameDistributionId', {
      description: 'GitHub Secrets: GAME_CLOUDFRONT_DISTRIBUTION_ID',
      value: gameDistribution.distributionId,
    });

    new cdk.CfnOutput(this, 'SalaryBucketName', {
      description: 'GitHub Secrets: SALARY_S3_BUCKET',
      value: salaryBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'SalaryDistributionId', {
      description: 'GitHub Secrets: SALARY_CLOUDFRONT_DISTRIBUTION_ID',
      value: salaryDistribution.distributionId,
    });
  }
}
