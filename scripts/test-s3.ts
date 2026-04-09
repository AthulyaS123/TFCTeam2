import 'dotenv/config'
import { uploadObject, getObject, deleteObject } from '../src/lib/s3'

const TEST_KEY = 'test/hello.txt'
const TEST_CONTENT = 'Hello from S3 test script!'

async function run() {
  console.log('--- S3 Test ---')

  // Upload
  console.log(`Uploading "${TEST_KEY}"...`)
  await uploadObject(TEST_KEY, TEST_CONTENT, 'text/plain')
  console.log('Upload OK')

  // Read back
  console.log(`Reading "${TEST_KEY}"...`)
  const content = await getObject(TEST_KEY)
  console.log('Read OK:', content)

  // Delete
  /*
  console.log(`Deleting "${TEST_KEY}"...`)
  await deleteObject(TEST_KEY)
  console.log('Delete OK')
  */
  console.log('--- All tests passed ---')
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
