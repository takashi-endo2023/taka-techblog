import * as cdk from 'aws-cdk-lib';
import { CertStack } from '../lib/cert-stack';
import { BlogStack } from '../lib/blog-stack';

const app = new cdk.App();

const domainName         = app.node.tryGetContext('domainName')         as string;
const portfolioSubdomain = app.node.tryGetContext('portfolioSubdomain') as string;
const utagoeSubdomain    = app.node.tryGetContext('utagoeSubdomain')    as string;
const ecSubdomain        = app.node.tryGetContext('ecSubdomain')        as string;
const aiAdsSubdomain     = app.node.tryGetContext('aiAdsSubdomain')     as string;
const gameSubdomain      = app.node.tryGetContext('gameSubdomain')      as string;
const bucketName         = app.node.tryGetContext('bucketName')         as string;
const utagoeBucketName   = app.node.tryGetContext('utagoeBucketName')   as string;
const ecBucketName       = app.node.tryGetContext('ecBucketName')       as string;
const aiAdsBucketName    = app.node.tryGetContext('aiAdsBucketName')    as string;
const gameBucketName     = app.node.tryGetContext('gameBucketName')     as string;
const githubRepo         = app.node.tryGetContext('githubRepo')         as string;
const utagoeGithubRepo   = app.node.tryGetContext('utagoeGithubRepo')   as string;
const ecGithubRepo       = app.node.tryGetContext('ecGithubRepo')       as string;
const aiAdsGithubRepo    = app.node.tryGetContext('aiAdsGithubRepo')    as string;
const gameGithubRepo     = app.node.tryGetContext('gameGithubRepo')     as string;
const salarySubdomain    = app.node.tryGetContext('salarySubdomain')    as string;
const salaryBucketName   = app.node.tryGetContext('salaryBucketName')   as string;
const salaryGithubRepo   = app.node.tryGetContext('salaryGithubRepo')   as string;
const aiAdsLambdaName    = app.node.tryGetContext('aiAdsLambdaName')    as string;
const alertEmail         = app.node.tryGetContext('alertEmail')         as string;

const certStack = new CertStack(app, 'TakaBlogCertStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
  crossRegionReferences: true,
  domainName,
});

new BlogStack(app, 'TakaBlogStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'ap-northeast-1' },
  crossRegionReferences: true,
  domainName,
  portfolioSubdomain,
  utagoeSubdomain,
  ecSubdomain,
  aiAdsSubdomain,
  gameSubdomain,
  salarySubdomain,
  salaryBucketName,
  salaryGithubRepo,
  bucketName,
  utagoeBucketName,
  ecBucketName,
  aiAdsBucketName,
  gameBucketName,
  githubRepo,
  utagoeGithubRepo,
  ecGithubRepo,
  aiAdsGithubRepo,
  gameGithubRepo,
  aiAdsLambdaName,
  certificate: certStack.certificate,
  alertEmail,
});
