# SealProof

> Provably Authentic Content Registration and Verification System

SealProof is a decentralized platform that establishes immutable provenance for digital content using AI-powered detection, blockchain verification, and privacy-preserving storage. Built for the Walrus Haulout Hackathon 2025.

## 🎉 **DEPLOYMENT STATUS: PRODUCTION READY**

✅ **Smart Contracts Deployed** on Sui Testnet
✅ **Package ID**: ``
✅ **Frontend Build**: 0 TypeScript errors
✅ **Backend Build**: 0 TypeScript errors
✅ **Integration**: Full Walrus + Sui working

## 🎯 Value Proposition

In an age of deepfakes and AI-generated content, SealProof provides:

- **Immutable Provenance**: Register content at creation with cryptographic proof
- **AI Detection**: Real-time detection of AI-generated content using CLIP and ResNet
- **Privacy-First**: Seal-based encryption for sensitive content
- **Decentralized Storage**: Walrus for censorship-resistant, permanent storage
- **Verification Network**: Multi-node consensus for authenticity validation
- **Web3 Native**: Built on Sui blockchain with smart contract registry

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/passionate-dev7/sealproof.git
cd sealproof

# Install dependencies
npm install

# Start development environment
npm run dev

# Build smart contracts
npm run build:contracts

# Run tests
npm test
```

## 🏗️ Architecture

```
┌─────────────┐
│   Frontend  │ (React + TypeScript)
└──────┬──────┘
       │
┌──────▼──────────────────────────────────┐
│         Backend API (Node.js)           │
├──────────────┬──────────────┬───────────┤
│              │              │           │
▼              ▼              ▼           ▼
┌────────┐  ┌──────┐  ┌─────────┐  ┌─────────┐
│  Sui   │  │Walrus│  │  Seal   │  │AI Models│
│Contracts │Storage│  │Encrypt  │  │ CLIP   │
└────────┘  └──────┘  └─────────┘  └─────────┘
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed design.

## 🛠️ Tech Stack

### Blockchain & Storage
- **Sui Network**: Smart contract registry and provenance tracking
- **Walrus**: Decentralized blob storage for content
- **Seal**: Privacy-preserving encryption layer

### AI/ML
- **CLIP**: Image-text similarity and manipulation detection
- **ResNet**: Deep learning-based image analysis
- **OpenAI Whisper**: Audio authenticity verification

### Backend
- **Node.js + TypeScript**: API server
- **Express**: REST API framework
- **SQLite**: Metadata cache (optional)

### Frontend
- **React**: UI framework
- **TypeScript**: Type safety
- **TailwindCSS**: Styling
- **@mysten/sui.js**: Sui blockchain integration

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or pnpm
- Sui CLI (for contract deployment)
- Python 3.9+ (for AI models)

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Install AI models:**
```bash
cd ai-detection
pip install -r requirements.txt
python download_models.py
```

4. **Build contracts:**
```bash
cd contracts
sui move build
```

5. **Deploy contracts:**
```bash
sui client publish --gas-budget 100000000
```

6. **Start services:**
```bash
# Terminal 1: Backend API
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend

# Terminal 3: AI Detection Service
cd ai-detection && python app.py
```

## 🎬 Demo

- **Live Demo**: [https://sealproof.walrus.site](https://sealproof.walrus.site)
- **Demo Video**: [Watch on YouTube](https://youtu.be/your-video-id)
- **Example Content**: See [docs/examples](docs/examples)

## 📚 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [User Guide](docs/USER_GUIDE.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)

## 🏆 Hackathon Submission

**Track**: Provably Authentic

**Integration**:
- ✅ Walrus: Immutable content storage with blob references
- ✅ Seal: Privacy-preserving encryption for sensitive content
- ✅ Sui: Smart contract registry for provenance tracking

**Innovation**:
- First-of-its-kind AI detection at registration time
- Privacy-preserving verification network using Seal
- Hybrid public/private content model
- Multi-modal verification (image, video, audio, text)

## 🔑 Key Features

### Content Registration
- Upload images, videos, audio, documents
- Automatic AI generation detection
- Metadata extraction (EXIF, location, device)
- Immutable storage on Walrus
- Blockchain provenance certificate

### Verification
- Hash-based authenticity checking
- Multi-node consensus validation
- Audit trail with timestamps
- Visual similarity detection
- Manipulation detection

### Privacy
- Public, private, or encrypted modes
- Seal-based encryption
- Access control policies
- Selective disclosure
- Zero-knowledge proofs

## 🛣️ Roadmap

### Phase 1: MVP (Current)
- [x] Basic registration and verification
- [x] AI detection integration
- [x] Walrus storage
- [x] Sui smart contracts

### Phase 2: Enhanced Privacy
- [ ] Advanced Seal integration
- [ ] Multi-party access control
- [ ] Time-locked content
- [ ] Revocation mechanisms

### Phase 3: Scale
- [ ] Video/audio support
- [ ] Batch processing
- [ ] Mobile apps
- [ ] Browser extension

### Phase 4: Ecosystem
- [ ] API marketplace
- [ ] Verification oracles
- [ ] Integration SDKs
- [ ] Partner integrations

## 🤝 Contributing

We welcome contributions! See [DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for:
- Development setup
- Code style guidelines
- Testing requirements
- Pull request process

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🙏 Acknowledgments

- Walrus team for decentralized storage infrastructure
- Sui Foundation for blockchain platform
- Seal team for privacy-preserving encryption
- OpenAI for CLIP model
---

**Built with ❤️ for Walrus Hallout Hackathon 2025**
