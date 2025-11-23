'use client';

/**
 * Nautilus Integration Service
 *
 * Provides AI detection functionality with verifiable attestations
 * through Nautilus secure enclaves or mock implementation for development.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * AI Detection confidence levels
 */
export enum ConfidenceLevel {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

/**
 * Detection model types
 */
export enum DetectionModel {
  GPT_DETECTOR = 'GPT_DETECTOR',
  ROBERTA_BASE = 'ROBERTA_BASE',
  ENSEMBLE = 'ENSEMBLE',
  BINOCULARS = 'BINOCULARS',
  FAST_DETECT = 'FAST_DETECT',
}

/**
 * Input parameters for AI detection
 */
export interface DetectionRequest {
  content: string;
  model?: DetectionModel;
  includeMetadata?: boolean;
}

/**
 * Metadata about the detection process
 */
export interface DetectionMetadata {
  processingTimeMs: number;
  contentLength: number;
  modelVersion: string;
  enclaveId?: string;
  hardwareAttested: boolean;
}

/**
 * Attestation structure containing cryptographic proof
 */
export interface Attestation {
  bytes: Uint8Array;
  format: 'TEE' | 'MOCK';
  algorithm: string;
  publicKey?: string;
  signedAt: string;
}

/**
 * Complete detection result with attestation
 */
export interface DetectionResult {
  aiScore: number; // 0-100: probability content is AI-generated
  confidenceLevel: ConfidenceLevel;
  attestation: Attestation;
  model: DetectionModel;
  timestamp: string;
  metadata?: DetectionMetadata;
}

/**
 * Verification result for attestation
 */
export interface VerificationResult {
  isValid: boolean;
  verifiedAt: string;
  enclaveVerified: boolean;
  signatureValid: boolean;
  errors?: string[];
}

/**
 * Configuration for Nautilus service
 */
export interface NautilusConfig {
  enclaveEndpoint?: string;
  apiKey?: string;
  timeout?: number;
  useEnclave?: boolean;
  defaultModel?: DetectionModel;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determines confidence level based on AI score
 */
function calculateConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 90) return ConfidenceLevel.VERY_HIGH;
  if (score >= 70) return ConfidenceLevel.HIGH;
  if (score >= 40) return ConfidenceLevel.MEDIUM;
  if (score >= 20) return ConfidenceLevel.LOW;
  return ConfidenceLevel.VERY_LOW;
}

/**
 * Generates mock attestation for development/fallback
 */
function generateMockAttestation(
  content: string,
  score: number,
  model: DetectionModel
): Attestation {
  const data = {
    content: content.substring(0, 100),
    score,
    model,
    timestamp: new Date().toISOString(),
    nonce: Math.random().toString(36).substring(7),
  };

  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(jsonString);

  // Simulate cryptographic signature (64 bytes for mock ECDSA)
  const signature = new Uint8Array(64);
  crypto.getRandomValues(signature);

  // Combine data + signature
  const attestationBytes = new Uint8Array(bytes.length + signature.length);
  attestationBytes.set(bytes, 0);
  attestationBytes.set(signature, bytes.length);

  return {
    bytes: attestationBytes,
    format: 'MOCK',
    algorithm: 'MOCK-ECDSA-P256',
    signedAt: new Date().toISOString(),
  };
}

/**
 * Simulates AI detection using heuristics
 * In production, this would call actual ML models
 */
function mockAIDetection(content: string, model: DetectionModel): number {
  const text = content.toLowerCase();
  let score = 50; // Base score

  // Heuristic 1: Repetitive patterns
  const repetitivePatterns = /\b(\w+)\s+\1\b/g;
  const repetitions = (text.match(repetitivePatterns) || []).length;
  score += Math.min(repetitions * 5, 15);

  // Heuristic 2: Formal language indicators
  const formalWords = [
    'furthermore',
    'moreover',
    'however',
    'therefore',
    'thus',
    'consequently',
    'additionally',
    'nevertheless',
  ];
  const formalCount = formalWords.filter((word) => text.includes(word)).length;
  score += Math.min(formalCount * 3, 12);

  // Heuristic 3: Uniform sentence length
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > 3) {
    const avgLength =
      sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
    const variance =
      sentences.reduce((sum, s) => sum + Math.pow(s.length - avgLength, 2), 0) /
      sentences.length;
    if (variance < 100) score += 10;
  }

  // Heuristic 4: Lack of personal pronouns
  const personalPronouns = /\b(i|me|my|mine|we|us|our|ours)\b/gi;
  const pronounCount = (text.match(personalPronouns) || []).length;
  if (pronounCount === 0 && content.length > 100) score += 8;

  // Heuristic 5: Perfect grammar (simplified check)
  const grammarErrors = /\b(your|you're|there|their|they're|its|it's)\b/gi;
  const errorCount = (text.match(grammarErrors) || []).length;
  if (errorCount === 0 && content.length > 100) score += 5;

  // Model-specific adjustments
  switch (model) {
    case DetectionModel.ENSEMBLE:
      score *= 1.1; // Ensemble models typically more confident
      break;
    case DetectionModel.FAST_DETECT:
      score *= 0.9; // Fast models slightly less accurate
      break;
    case DetectionModel.BINOCULARS:
      score += Math.random() * 10 - 5; // Add some variance
      break;
  }

  // Clamp between 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ============================================================================
// Nautilus Integration Service
// ============================================================================

export class NautilusIntegrationService {
  private config: Required<NautilusConfig>;
  private enclaveAvailable: boolean = false;

  constructor(config: NautilusConfig = {}) {
    this.config = {
      enclaveEndpoint: config.enclaveEndpoint || '',
      apiKey: config.apiKey || '',
      timeout: config.timeout || 30000,
      useEnclave: config.useEnclave ?? true,
      defaultModel: config.defaultModel || DetectionModel.ENSEMBLE,
    };

    this.initializeEnclave();
  }

  /**
   * Initializes connection to Nautilus enclave
   */
  private async initializeEnclave(): Promise<void> {
    if (!this.config.useEnclave || !this.config.enclaveEndpoint) {
      this.enclaveAvailable = false;
      return;
    }

    try {
      // Attempt to connect to enclave
      const response = await fetch(`${this.config.enclaveEndpoint}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
        signal: AbortSignal.timeout(5000),
      });

      this.enclaveAvailable = response.ok;
    } catch (error) {
      console.warn('Nautilus enclave not available, using mock mode:', error);
      this.enclaveAvailable = false;
    }
  }

  /**
   * Performs AI detection on content with attestation
   */
  public async detectAI(request: DetectionRequest): Promise<DetectionResult> {
    const startTime = Date.now();
    const model = request.model || this.config.defaultModel;

    if (this.enclaveAvailable) {
      return this.detectWithEnclave(request, model, startTime);
    } else {
      return this.detectWithMock(request, model, startTime);
    }
  }

  /**
   * Detects AI using Nautilus enclave
   */
  private async detectWithEnclave(
    request: DetectionRequest,
    model: DetectionModel,
    startTime: number
  ): Promise<DetectionResult> {
    try {
      const response = await fetch(`${this.config.enclaveEndpoint}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          content: request.content,
          model,
          includeMetadata: request.includeMetadata,
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Enclave request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      return {
        aiScore: data.aiScore,
        confidenceLevel: calculateConfidenceLevel(data.aiScore),
        attestation: {
          bytes: new Uint8Array(data.attestation.bytes),
          format: 'TEE',
          algorithm: data.attestation.algorithm,
          publicKey: data.attestation.publicKey,
          signedAt: data.attestation.signedAt,
        },
        model,
        timestamp: new Date().toISOString(),
        metadata: request.includeMetadata
          ? {
              processingTimeMs: processingTime,
              contentLength: request.content.length,
              modelVersion: data.modelVersion,
              enclaveId: data.enclaveId,
              hardwareAttested: true,
            }
          : undefined,
      };
    } catch (error) {
      console.warn('Enclave detection failed, falling back to mock:', error);
      return this.detectWithMock(request, model, startTime);
    }
  }

  /**
   * Detects AI using mock implementation
   */
  private async detectWithMock(
    request: DetectionRequest,
    model: DetectionModel,
    startTime: number
  ): Promise<DetectionResult> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 400));

    const aiScore = mockAIDetection(request.content, model);
    const processingTime = Date.now() - startTime;
    const attestation = generateMockAttestation(request.content, aiScore, model);

    return {
      aiScore,
      confidenceLevel: calculateConfidenceLevel(aiScore),
      attestation,
      model,
      timestamp: new Date().toISOString(),
      metadata: request.includeMetadata
        ? {
            processingTimeMs: processingTime,
            contentLength: request.content.length,
            modelVersion: 'mock-v1.0.0',
            hardwareAttested: false,
          }
        : undefined,
    };
  }

  /**
   * Verifies an attestation
   */
  public async verifyAttestation(
    attestation: Attestation,
    originalContent?: string
  ): Promise<VerificationResult> {
    const verifiedAt = new Date().toISOString();

    if (attestation.format === 'MOCK') {
      return {
        isValid: true,
        verifiedAt,
        enclaveVerified: false,
        signatureValid: true,
        errors: ['Mock attestation - not cryptographically verified'],
      };
    }

    if (!this.enclaveAvailable) {
      return {
        isValid: false,
        verifiedAt,
        enclaveVerified: false,
        signatureValid: false,
        errors: ['Enclave not available for verification'],
      };
    }

    try {
      const response = await fetch(`${this.config.enclaveEndpoint}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          attestation: Array.from(attestation.bytes),
          originalContent,
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        isValid: data.isValid,
        verifiedAt,
        enclaveVerified: data.enclaveVerified,
        signatureValid: data.signatureValid,
        errors: data.errors,
      };
    } catch (error) {
      return {
        isValid: false,
        verifiedAt,
        enclaveVerified: false,
        signatureValid: false,
        errors: [error instanceof Error ? error.message : 'Verification failed'],
      };
    }
  }

  /**
   * Batch detection for multiple content items
   */
  public async detectBatch(
    requests: DetectionRequest[]
  ): Promise<DetectionResult[]> {
    return Promise.all(requests.map((request) => this.detectAI(request)));
  }

  /**
   * Checks if enclave is available
   */
  public isEnclaveAvailable(): boolean {
    return this.enclaveAvailable;
  }

  /**
   * Gets current configuration
   */
  public getConfig(): Readonly<Required<NautilusConfig>> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Updates configuration (re-initializes enclave if endpoint changes)
   */
  public async updateConfig(config: Partial<NautilusConfig>): Promise<void> {
    const endpointChanged = config.enclaveEndpoint !== this.config.enclaveEndpoint;

    Object.assign(this.config, config);

    if (endpointChanged) {
      await this.initializeEnclave();
    }
  }
}

// ============================================================================
// Singleton Instance (Optional)
// ============================================================================

let defaultInstance: NautilusIntegrationService | null = null;

/**
 * Gets or creates the default Nautilus service instance
 */
export function getNautilusService(config?: NautilusConfig): NautilusIntegrationService {
  if (!defaultInstance) {
    defaultInstance = new NautilusIntegrationService(config);
  }
  return defaultInstance;
}

/**
 * Resets the default instance (useful for testing)
 */
export function resetNautilusService(): void {
  defaultInstance = null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Converts attestation bytes to base64 string for storage/transmission
 */
export function attestationToBase64(attestation: Attestation): string {
  const binaryString = String.fromCharCode(...Array.from(attestation.bytes));
  return btoa(binaryString);
}

/**
 * Converts base64 string back to attestation bytes
 */
export function base64ToAttestation(
  base64: string,
  format: Attestation['format'],
  algorithm: string,
  signedAt: string,
  publicKey?: string
): Attestation {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return {
    bytes,
    format,
    algorithm,
    signedAt,
    publicKey,
  };
}

/**
 * Formats AI score for display
 */
export function formatAIScore(score: number): string {
  if (score >= 90) return `${score}% (Very likely AI)`;
  if (score >= 70) return `${score}% (Likely AI)`;
  if (score >= 40) return `${score}% (Possibly AI)`;
  if (score >= 20) return `${score}% (Unlikely AI)`;
  return `${score}% (Very unlikely AI)`;
}

/**
 * Gets color indicator for confidence level
 */
export function getConfidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case ConfidenceLevel.VERY_HIGH:
      return '#ef4444'; // red-500
    case ConfidenceLevel.HIGH:
      return '#f97316'; // orange-500
    case ConfidenceLevel.MEDIUM:
      return '#eab308'; // yellow-500
    case ConfidenceLevel.LOW:
      return '#22c55e'; // green-500
    case ConfidenceLevel.VERY_LOW:
      return '#10b981'; // emerald-500
  }
}
