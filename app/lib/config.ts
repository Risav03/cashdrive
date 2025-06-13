export const secrets = {
  MONGODB_URI: process.env.MONGODB_URI || '',
  
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  
  AWS_ACCESS_KEY_ID: process.env.AWS_S3_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_S3_SECRET_ACCESS_KEY || '',
  AWS_REGION: process.env.AWS_S3_REGION || 'us-east-1',
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || '',
} as const;

export const validateS3Config = (): boolean => {
  return !!(
    secrets.AWS_ACCESS_KEY_ID &&
    secrets.AWS_SECRET_ACCESS_KEY &&
    secrets.AWS_S3_BUCKET_NAME &&
    secrets.AWS_REGION
  );
};

export const validateMongoConfig = (): boolean => {
  return !!secrets.MONGODB_URI;
};

export const validateAuthConfig = (): boolean => {
  return !!secrets.NEXTAUTH_SECRET;
};
