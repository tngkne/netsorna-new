import { AwsClient } from 'aws4fetch';

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const { filename, contentType } = await request.json();

    if (!filename) {
      return new Response(JSON.stringify({ error: 'Filename required' }), { status: 400, headers });
    }

    // Unique storage key inside the R2 Bucket
    const fileKey = `uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Cloudflare S3 API compatibility layer for R2 Bucket
    const aws = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      service: 's3',
      region: 'auto'
    });

    const endpointUrl = new URL(`https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${fileKey}`);
    endpointUrl.searchParams.set('X-Amz-Expires', '3600'); // Valid for 1 hour

    // Generate AWS V4 Signed URL for direct client PUT
    const signedRequest = await aws.sign(new Request(endpointUrl, { method: 'PUT' }), {
      aws: { signQuery: true }
    });

    return new Response(
      JSON.stringify({
        uploadUrl: signedRequest.url,
        fileKey: fileKey
      }),
      { status: 200, headers }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'Failed to generate upload URL',
        details: err.message
      }),
      { status: 500, headers }
    );
  }
}
