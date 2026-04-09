import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

// This file is SERVER-SIDE ONLY — never import in client components
const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.S3_BUCKET_NAME!

// CREATE — upload text or binary content
export async function uploadObject(key: string, body: string | Buffer, contentType = 'application/json'): Promise<void> {
  const upload = new Upload({
    client: s3,
    params: { Bucket: BUCKET, Key: key, Body: body, ContentType: contentType },
  })
  await upload.done()
}

// READ — get object content as string
export async function getObject(key: string): Promise<string> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  if (!res.Body) throw new Error('Empty S3 response')
  return res.Body.transformToString()
}

// LIST — list object keys, optional prefix filter
export async function listObjects(prefix = ''): Promise<string[]> {
  const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }))
  return (res.Contents ?? []).map((obj) => obj.Key ?? '')
}

// DELETE — remove an object
export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
