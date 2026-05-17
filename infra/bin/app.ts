import * as cdk from 'aws-cdk-lib';
import { CertStack } from '../lib/cert-stack';
import { BlogStack } from '../lib/blog-stack';

const app = new cdk.App();

const domainName         = app.node.tryGetContext('domainName')         as string;
const portfolioSubdomain = app.node.tryGetContext('portfolioSubdomain') as string;
const utagoeSubdomain    = app.node.tryGetContext('utagoeSubdomain')    as string;
const bucketName         = app.node.tryGetContext('bucketName')         as string;
const utagoeBucketName   = app.node.tryGetContext('utagoeBucketName')   as string;
const githubRepo         = app.node.tryGetContext('githubRepo')         as string;
const utagoeGithubRepo   = app.node.tryGetContext('utagoeGithubRepo')   as string;
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
  bucketName,
  utagoeBucketName,
  githubRepo,
  utagoeGithubRepo,
  certificate: certStack.certificate,
  alertEmail,
});
