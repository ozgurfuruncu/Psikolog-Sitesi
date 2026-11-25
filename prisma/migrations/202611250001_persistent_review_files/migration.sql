-- Keep small review uploads with their metadata on hosts with ephemeral disks.
CREATE TABLE "PrivateFileContent" (
  "fileId" TEXT NOT NULL PRIMARY KEY,
  "bytes" BYTEA NOT NULL,
  CONSTRAINT "PrivateFileContent_fileId_fkey" FOREIGN KEY ("fileId")
    REFERENCES "PrivateFile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PrivateFileContent_size_check" CHECK (octet_length("bytes") <= 5242880)
);
