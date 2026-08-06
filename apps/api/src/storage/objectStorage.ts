import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import type { AppConfig } from "../config.js";

export interface ObjectStorage {
  putText(key: string, content: string, mimeType: string): Promise<void>;
  getText(key: string): Promise<string>;
}

export class LocalObjectStorage implements ObjectStorage {
  public constructor(private readonly rootDirectory = "data/objects") {}

  public async putText(key: string, content: string, _mimeType: string): Promise<void> {
    const path = join(this.rootDirectory, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
  }

  public async getText(key: string): Promise<string> {
    return readFile(join(this.rootDirectory, key), "utf8");
  }
}

export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;

  public constructor(private readonly config: AppConfig) {
    this.client = new S3Client({
      endpoint: config.OBJECT_STORAGE_ENDPOINT,
      region: config.OBJECT_STORAGE_REGION,
      forcePathStyle: config.OBJECT_STORAGE_FORCE_PATH_STYLE,
      credentials:
        config.OBJECT_STORAGE_ACCESS_KEY && config.OBJECT_STORAGE_SECRET_KEY
          ? {
              accessKeyId: config.OBJECT_STORAGE_ACCESS_KEY,
              secretAccessKey: config.OBJECT_STORAGE_SECRET_KEY
            }
          : undefined
    });
  }

  public async putText(key: string, content: string, mimeType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.OBJECT_STORAGE_BUCKET,
        Key: key,
        Body: content,
        ContentType: mimeType
      })
    );
  }

  public async getText(key: string): Promise<string> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.OBJECT_STORAGE_BUCKET,
        Key: key
      })
    );
    return result.Body?.transformToString() ?? "";
  }
}
