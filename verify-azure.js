const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');

async function main() {
  const conn = process.env.AZURE_CONNECTION_STRING;
  const container = process.env.AZURE_CONTAINER || 'task';

  if (!conn) {
    console.error('❌ AZURE_CONNECTION_STRING is not set');
    process.exit(1);
  }

  const svc = BlobServiceClient.fromConnectionString(conn);
  const c = svc.getContainerClient(container);
  await c.createIfNotExists();

  // 임시 파일 생성
  const localPath = './healthcheck.txt';
  fs.writeFileSync(localPath, 'ok');

  const blobName = `healthcheck-${Date.now()}.txt`;
  const b = c.getBlockBlobClient(blobName);

  await b.uploadFile(localPath, {
    blobHTTPHeaders: { blobContentType: 'text/plain' },
  });

  console.log('✅ Upload success:', b.url);
}

main().catch((err) => {
  console.error('❌ Upload failed:', err.message);
  process.exit(1);
});
