const trimStart = (s, ch) => (s[0] === ch ? trimStart(s.substr(1), ch) : s);
const trimEnd = (s, ch) =>
  s[s.length - 1] === ch ? trimEnd(s.substr(0, s.length - 1), ch) : s;

module.exports = function S3LS(options) {
  if (!options || typeof options.bucket !== "string") {
    throw new Error("Bad 'bucket'");
  }

  const bucket = options.bucket;
  var AWS = require('aws-sdk');

  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  });

  const s3 = new AWS.S3({ apiVersion: "2006-03-01" });


  return {
    ls(path) {
      const prefix = trimStart(trimEnd(path, "/") + "/", "/");
      const result = { files: [], folders: [] };

      function s3ListCheckTruncated(data) {
        result.files = result.files.concat(
          (data.Contents || []).map(i => i.Key)
        );
        result.folders = result.folders.concat(
          (data.CommonPrefixes || []).map(i => i.Prefix)
        );

        if (data.IsTruncated) {
          return s3
            .listObjectsV2({
              Bucket: bucket,
              MaxKeys: 2147483647, // Maximum allowed by S3 API
              Delimiter: "/",
              Prefix: prefix,
              ContinuationToken: data.NextContinuationToken
            })
            .promise()
            .then(s3ListCheckTruncated);
        }

        return result;
      }

      return s3
        .listObjectsV2({
          Bucket: bucket,
          MaxKeys: 2147483647, // Maximum allowed by S3 API
          Delimiter: "/",
          Prefix: prefix,
          StartAfter: prefix // removes the folder name from listing
        })
        .promise()
        .then(s3ListCheckTruncated);
    }
  };
};
