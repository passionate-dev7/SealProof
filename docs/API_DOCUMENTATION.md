# SealProof API Documentation

## Base URL

```
Production: https://api.truthchain.io/v1
Testnet:    https://testnet-api.truthchain.io/v1
Local:      http://localhost:3000/v1
```

## Authentication

SealProof uses JWT (JSON Web Tokens) for authentication.

### Get Access Token

```http
POST /auth/login
Content-Type: application/json

{
  "wallet_address": "0x1a2b3c4d...",
  "signature": "0xsignature...",
  "message": "Login to SealProof"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600
}
```

### Use Token

Include in Authorization header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Endpoints

### 1. Content Registration

#### Register Content

```http
POST /register
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: (binary)
privacy: "public" | "private" | "encrypted"
aiDetection: boolean
metadata: JSON string
accessPolicy: JSON string (for encrypted content)
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Content to register (image, video, audio, document) |
| privacy | String | Yes | Privacy level: public, private, or encrypted |
| aiDetection | Boolean | No | Enable AI detection (default: true) |
| metadata | JSON | No | Additional metadata (title, description, tags) |
| accessPolicy | JSON | No | Access control policy (required for encrypted) |

**Metadata Schema**:
```json
{
  "title": "My Image",
  "description": "A beautiful landscape photo",
  "tags": ["nature", "landscape", "photography"],
  "location": {
    "lat": 37.7749,
    "lon": -122.4194
  },
  "custom": {
    "key": "value"
  }
}
```

**Access Policy Schema** (for encrypted content):
```json
{
  "type": "allowlist",
  "addresses": [
    "0x1a2b3c4d...",
    "0x5e6f7g8h..."
  ],
  "conditions": {
    "timeLock": 1735689600,
    "geofence": {
      "type": "Polygon",
      "coordinates": [[[-122.5, 37.7], [-122.4, 37.7], ...]]
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "contentHash": "0x1a2b3c4d5e6f7g8h...",
    "perceptualHash": "0x9i8h7g6f5e4d3c2b...",
    "walrusBlobId": "0xwalrus1a2b3c...",
    "suiObjectId": "0xsui4d5e6f...",
    "timestamp": 1735689600000,
    "aiDetection": {
      "isAiGenerated": false,
      "confidence": 0.135,
      "clipScore": 0.15,
      "resnetScore": 0.12
    },
    "certificate": {
      "id": "cert-1a2b3c",
      "url": "https://api.truthchain.io/v1/certificate/cert-1a2b3c",
      "pdfUrl": "https://api.truthchain.io/v1/certificate/cert-1a2b3c/pdf",
      "qrCode": "data:image/png;base64,iVBOR..."
    },
    "verificationUrl": "https://truthchain.io/verify/0x1a2b3c..."
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "File type not supported",
    "details": {
      "supportedTypes": ["image/jpeg", "image/png", "video/mp4"]
    }
  }
}
```

**Status Codes**:
- 200: Success
- 400: Invalid request (bad file, missing parameters)
- 401: Unauthorized (invalid or missing token)
- 413: File too large (max 100MB)
- 429: Rate limit exceeded
- 500: Server error

**Example (cURL)**:
```bash
curl -X POST https://api.truthchain.io/v1/register \
  -H "Authorization: Bearer eyJhbGciOiJI..." \
  -F "file=@/path/to/image.jpg" \
  -F "privacy=public" \
  -F "aiDetection=true" \
  -F 'metadata={"title":"My Photo","tags":["test"]}'
```

**Example (JavaScript)**:
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('privacy', 'public');
formData.append('aiDetection', 'true');
formData.append('metadata', JSON.stringify({
  title: 'My Photo',
  tags: ['test']
}));

const response = await fetch('https://api.truthchain.io/v1/register', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});

const result = await response.json();
console.log(result.data.certificate.url);
```

### 2. Content Verification

#### Verify by Hash

```http
POST /verify/hash
Authorization: Bearer {token}
Content-Type: application/json

{
  "hash": "0x1a2b3c4d5e6f7g8h...",
  "consensus": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "isAuthentic": true,
    "confidence": 0.95,
    "contentHash": "0x1a2b3c4d5e6f7g8h...",
    "registrationTimestamp": 1735689600000,
    "creator": "0x1a2b3c4d...",
    "aiDetection": {
      "isAiGenerated": false,
      "confidence": 0.135
    },
    "metadata": {
      "title": "My Photo",
      "description": "...",
      "tags": ["test"]
    },
    "verificationCount": 42,
    "consensusResult": {
      "verdict": "authentic",
      "confidence": 0.95,
      "nodeVotes": [
        {
          "nodeId": "node-1",
          "verdict": "authentic",
          "confidence": 0.96
        },
        {
          "nodeId": "node-2",
          "verdict": "authentic",
          "confidence": 0.94
        }
      ]
    }
  }
}
```

#### Verify by File Upload

```http
POST /verify/file
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: (binary)
method: "exact" | "perceptual" | "visual"
consensus: boolean
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Content to verify |
| method | String | No | Verification method (default: exact) |
| consensus | Boolean | No | Enable multi-node consensus (default: false) |

**Verification Methods**:
- **exact**: SHA-256 hash comparison (fastest, requires exact match)
- **perceptual**: pHash comparison (detects minor edits, cropping)
- **visual**: CLIP embedding similarity (detects visual modifications)

**Response** (when not found):
```json
{
  "success": true,
  "data": {
    "isAuthentic": false,
    "confidence": 0.0,
    "message": "Content not found in registry",
    "suggestions": [
      {
        "contentHash": "0x9i8h7g6f...",
        "similarity": 0.87,
        "title": "Similar Image"
      }
    ]
  }
}
```

### 3. Certificate Management

#### Get Certificate

```http
GET /certificate/{certificateId}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "cert-1a2b3c",
    "contentHash": "0x1a2b3c4d...",
    "registrationTimestamp": 1735689600000,
    "creator": "0x1a2b3c4d...",
    "aiDetection": {...},
    "metadata": {...},
    "blockchain": {
      "network": "sui-mainnet",
      "objectId": "0xsui4d5e6f...",
      "transactionDigest": "0xtx1a2b3c..."
    },
    "storage": {
      "provider": "walrus",
      "blobId": "0xwalrus1a2b3c...",
      "size": 2048576,
      "encoding": "erasure-coded"
    }
  }
}
```

#### Download Certificate PDF

```http
GET /certificate/{certificateId}/pdf
```

Returns PDF file with provenance certificate.

#### Verify Certificate

```http
POST /certificate/{certificateId}/verify
Content-Type: application/json

{
  "signature": "0xsignature..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "signedBy": "SealProof Registry",
    "signatureTimestamp": 1735689600000
  }
}
```

### 4. Privacy Operations

#### Encrypt Content

```http
POST /encrypt
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: (binary)
accessPolicy: JSON string
```

**Response**:
```json
{
  "success": true,
  "data": {
    "encryptedContentId": "0xenc1a2b3c...",
    "walrusBlobId": "0xwalrus1a2b3c...",
    "suiKeyObjectId": "0xsui4d5e6f...",
    "accessPolicy": {...},
    "decryptionInstructions": "To decrypt, call /decrypt with valid access proof"
  }
}
```

#### Decrypt Content

```http
POST /decrypt
Authorization: Bearer {token}
Content-Type: application/json

{
  "encryptedContentId": "0xenc1a2b3c...",
  "accessProof": {
    "address": "0x1a2b3c4d...",
    "signature": "0xsignature...",
    "timestamp": 1735689600000
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "contentUrl": "https://api.truthchain.io/v1/content/temp/abc123",
    "expiresIn": 3600,
    "contentType": "image/jpeg",
    "size": 2048576
  }
}
```

**Error Response** (access denied):
```json
{
  "success": false,
  "error": {
    "code": "ACCESS_DENIED",
    "message": "Address not in allowlist",
    "details": {
      "policy": "allowlist",
      "requiredAddresses": ["0x1a2b3c4d...", "0x5e6f7g8h..."]
    }
  }
}
```

### 5. Search & Browse

#### Search Content

```http
GET /search?q={query}&tags={tags}&creator={address}&sort={field}&order={asc|desc}&page={num}&limit={num}
Authorization: Bearer {token}
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | String | No | Full-text search query |
| tags | String | No | Comma-separated tags |
| creator | String | No | Filter by creator address |
| sort | String | No | Sort field (timestamp, verifications) |
| order | String | No | Sort order (asc, desc) |
| page | Number | No | Page number (default: 1) |
| limit | Number | No | Results per page (default: 20, max: 100) |

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "contentHash": "0x1a2b3c4d...",
        "metadata": {
          "title": "My Photo",
          "tags": ["nature"]
        },
        "timestamp": 1735689600000,
        "verificationCount": 42,
        "aiDetection": {
          "isAiGenerated": false
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

#### Get Content Metadata

```http
GET /content/{contentHash}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "contentHash": "0x1a2b3c4d...",
    "perceptualHash": "0x9i8h7g6f...",
    "creator": "0x1a2b3c4d...",
    "timestamp": 1735689600000,
    "privacy": "public",
    "metadata": {...},
    "aiDetection": {...},
    "verificationCount": 42,
    "blockchain": {...},
    "storage": {...},
    "contentUrl": "https://walrus.site/blob/0xwalrus1a2b3c..."
  }
}
```

### 6. AI Detection

#### Analyze Content

```http
POST /ai/detect
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: (binary)
models: ["clip", "resnet", "whisper"]
```

**Response**:
```json
{
  "success": true,
  "data": {
    "isAiGenerated": false,
    "confidence": 0.135,
    "modelResults": {
      "clip": {
        "score": 0.15,
        "interpretation": "Likely authentic human-created content"
      },
      "resnet": {
        "score": 0.12,
        "features": {
          "hasSyntheticArtifacts": false,
          "colorAnomalies": 0.05
        }
      }
    },
    "metadata": {
      "hasExif": true,
      "exifAnomalies": [],
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 7. Statistics

#### Get Platform Statistics

```http
GET /stats
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalRegistrations": 150000,
    "totalVerifications": 450000,
    "uniqueCreators": 5000,
    "storageUsed": "50 TB",
    "aiDetections": {
      "totalScanned": 150000,
      "aiGenerated": 12000,
      "authentic": 138000
    },
    "privacyDistribution": {
      "public": 120000,
      "private": 20000,
      "encrypted": 10000
    }
  }
}
```

#### Get User Statistics

```http
GET /stats/user/{address}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "address": "0x1a2b3c4d...",
    "registrations": 42,
    "verificationRequests": 128,
    "storageUsed": "2.5 GB",
    "joinedAt": 1735689600000
  }
}
```

## Rate Limits

| Tier | Requests/Hour | Max File Size |
|------|---------------|---------------|
| Free | 100 | 10 MB |
| Basic | 1,000 | 50 MB |
| Pro | 10,000 | 100 MB |
| Enterprise | Unlimited | 1 GB |

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1735693200
```

**Rate Limit Error**:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retryAfter": 3600
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_REQUEST | 400 | Malformed request |
| INVALID_FILE_TYPE | 400 | Unsupported file type |
| FILE_TOO_LARGE | 413 | File exceeds size limit |
| UNAUTHORIZED | 401 | Missing or invalid token |
| ACCESS_DENIED | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| BLOCKCHAIN_ERROR | 500 | Sui transaction failed |
| STORAGE_ERROR | 500 | Walrus storage failed |
| AI_DETECTION_ERROR | 500 | AI service unavailable |
| ENCRYPTION_ERROR | 500 | Seal encryption failed |
| INTERNAL_ERROR | 500 | Unexpected server error |

## Webhooks

Subscribe to events:

```http
POST /webhooks/subscribe
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://your-server.com/webhook",
  "events": ["registration", "verification", "access_request"],
  "secret": "your-secret-key"
}
```

**Webhook Payload**:
```json
{
  "event": "registration",
  "timestamp": 1735689600000,
  "signature": "sha256=...",
  "data": {
    "contentHash": "0x1a2b3c4d...",
    "creator": "0x1a2b3c4d...",
    "privacy": "public"
  }
}
```

## SDKs

### JavaScript/TypeScript

```bash
npm install @truthchain/sdk
```

```typescript
import { SealProof } from '@truthchain/sdk';

const client = new SealProof({
  apiKey: 'your-api-key',
  network: 'mainnet'
});

// Register content
const result = await client.register({
  file: fileBlob,
  privacy: 'public',
  aiDetection: true
});

// Verify content
const verification = await client.verify(contentHash);
```

### Python

```bash
pip install truthchain
```

```python
from truthchain import SealProof

client = SealProof(api_key='your-api-key')

# Register content
result = client.register(
    file=open('image.jpg', 'rb'),
    privacy='public',
    ai_detection=True
)

# Verify content
verification = client.verify(content_hash)
```

## Testing

**Testnet**:
- Base URL: `https://testnet-api.truthchain.io/v1`
- Faucet: `https://testnet.truthchain.io/faucet`
- Test tokens: Request at faucet with wallet address

**Sandbox**:
- All operations succeed but don't hit real blockchain/storage
- Use header: `X-SealProof-Sandbox: true`

---

For more details, see [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)
