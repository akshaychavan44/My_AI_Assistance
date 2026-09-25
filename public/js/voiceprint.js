// ================= VOICE BIOMETRICS & SPEAKER VERIFICATION ENGINE =================
// Analyzes human vocal harmonics, pitch contours, and spectral timbre vectors
// Ensures voice commands only execute when spoken by the authenticated vault owner.

export class VoiceprintEngine {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.enrolledVoiceprint = null;
    this.threshold = 0.80; // Similarity threshold (80% match required)
  }

  async initAudio() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // Extract acoustic feature vector from an audio frame
  extractFrameFeatures(freqData, timeData, sampleRate) {
    const binWidth = (sampleRate / 2) / freqData.length;

    // 1. Calculate energy distribution across 16 logarithmic frequency bands (Timbre profile)
    const numBands = 16;
    const bandEnergies = new Float32Array(numBands);
    const minFreq = 80;   // Human voice fundamental min
    const maxFreq = 4000; // Human vocal formant max

    for (let i = 0; i < freqData.length; i++) {
      const freq = i * binWidth;
      if (freq < minFreq || freq > maxFreq) continue;
      
      const bandIdx = Math.min(
        numBands - 1,
        Math.floor((Math.log(freq / minFreq) / Math.log(maxFreq / minFreq)) * numBands)
      );
      if (bandIdx >= 0) {
        bandEnergies[bandIdx] += Math.pow(10, freqData[i] / 20); // convert dB to linear amplitude
      }
    }

    // Normalize band energies
    let totalEnergy = 0;
    for (let b = 0; b < numBands; b++) totalEnergy += bandEnergies[b] * bandEnergies[b];
    const norm = Math.sqrt(totalEnergy) || 1e-6;
    for (let b = 0; b < numBands; b++) bandEnergies[b] /= norm;

    // 2. Spectral Centroid (Pitch brightness)
    let num = 0, den = 0;
    for (let i = 0; i < freqData.length; i++) {
      const mag = Math.pow(10, freqData[i] / 20);
      num += (i * binWidth) * mag;
      den += mag;
    }
    const centroid = den > 0 ? (num / den) / 4000 : 0;

    // 3. Zero Crossing Rate (Time-domain vocal tract dynamics)
    let zcr = 0;
    for (let i = 1; i < timeData.length; i++) {
      if ((timeData[i] >= 128 && timeData[i - 1] < 128) || (timeData[i] < 128 && timeData[i - 1] >= 128)) {
        zcr++;
      }
    }
    zcr = zcr / timeData.length;

    // 4. Fundamental Pitch Estimation via Autocorrelation
    const pitch = this.estimatePitch(timeData, sampleRate) / 500;

    // Combined 19-dimensional feature vector
    const vector = new Float32Array(numBands + 3);
    for (let b = 0; b < numBands; b++) vector[b] = bandEnergies[b];
    vector[numBands] = centroid;
    vector[numBands + 1] = zcr;
    vector[numBands + 2] = pitch;

    return { vector, energy: totalEnergy };
  }

  estimatePitch(timeData, sampleRate) {
    const SIZE = timeData.length;
    let sumSquares = 0;
    const norm = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++) {
      norm[i] = (timeData[i] - 128) / 128;
      sumSquares += norm[i] * norm[i];
    }
    if (sumSquares < 0.01) return 0; // silence

    let maxCorrelation = 0;
    let bestPeriod = 0;
    const minPeriod = Math.floor(sampleRate / 400); // 400 Hz max
    const maxPeriod = Math.floor(sampleRate / 70);  // 70 Hz min

    for (let period = minPeriod; period < maxPeriod && period < SIZE / 2; period++) {
      let correlation = 0;
      for (let i = 0; i < SIZE / 2; i++) {
        correlation += norm[i] * norm[i + period];
      }
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestPeriod = period;
      }
    }

    return bestPeriod > 0 ? sampleRate / bestPeriod : 0;
  }

  // Record audio and aggregate voiceprint vector during calibration
  async startCalibration(durationMs = 4500, onProgress = null) {
    await this.initAudio();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    this.mediaStream = stream;

    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);

    const freqData = new Float32Array(this.analyser.frequencyBinCount);
    const timeData = new Uint8Array(this.analyser.fftSize);
    const sampleRate = this.audioContext.sampleRate;
    const vectors = [];
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, Math.round((elapsed / durationMs) * 100));
        if (onProgress) onProgress(progress);

        this.analyser.getFloatFrequencyData(freqData);
        this.analyser.getByteTimeDomainData(timeData);

        const { vector, energy } = this.extractFrameFeatures(freqData, timeData, sampleRate);
        if (energy > 0.003) {
          vectors.push(vector);
        }

        if (elapsed >= durationMs) {
          clearInterval(interval);
          this.stopMicrophone();

          if (vectors.length < 5) {
            return reject(new Error('Audio too quiet or no voice detected. Please speak clearly into the microphone.'));
          }

          // Compute average vector (Voiceprint)
          const featureDim = vectors[0].length;
          const avgVector = new Array(featureDim).fill(0);
          for (const v of vectors) {
            for (let i = 0; i < featureDim; i++) avgVector[i] += v[i];
          }
          for (let i = 0; i < featureDim; i++) avgVector[i] /= vectors.length;

          // Normalize
          let mag = 0;
          for (let i = 0; i < featureDim; i++) mag += avgVector[i] * avgVector[i];
          mag = Math.sqrt(mag) || 1;
          const normalized = avgVector.map(x => x / mag);

          const voiceprint = {
            version: 1,
            enrolledAt: new Date().toISOString(),
            features: normalized
          };

          this.enrolledVoiceprint = voiceprint;
          resolve(voiceprint);
        }
      }, 70);
    });
  }

  // Real-time verification while a voice command is spoken
  async startLiveCapture() {
    await this.initAudio();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    this.mediaStream = stream;

    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);

    const freqData = new Float32Array(this.analyser.frequencyBinCount);
    const timeData = new Uint8Array(this.analyser.fftSize);
    const sampleRate = this.audioContext.sampleRate;
    const vectors = [];

    const interval = setInterval(() => {
      if (!this.analyser) return;
      this.analyser.getFloatFrequencyData(freqData);
      this.analyser.getByteTimeDomainData(timeData);

      const { vector, energy } = this.extractFrameFeatures(freqData, timeData, sampleRate);
      if (energy > 0.003) {
        vectors.push(vector);
      }
    }, 60);

    return {
      finish: () => {
        clearInterval(interval);
        this.stopMicrophone();

        if (!this.enrolledVoiceprint || !Array.isArray(this.enrolledVoiceprint.features)) {
          return { verified: false, notEnrolled: true, score: 0, reason: 'Voiceprint not calibrated yet' };
        }

        if (vectors.length < 2) {
          // If too short, return false for security
          return { verified: false, score: 0, reason: 'Voice sample too brief' };
        }

        // Compute average vector for live spoken command
        const featureDim = vectors[0].length;
        const liveVector = new Array(featureDim).fill(0);
        for (const v of vectors) {
          for (let i = 0; i < featureDim; i++) liveVector[i] += v[i];
        }
        for (let i = 0; i < featureDim; i++) liveVector[i] /= vectors.length;

        // Normalize
        let magA = 0;
        for (let i = 0; i < featureDim; i++) magA += liveVector[i] * liveVector[i];
        magA = Math.sqrt(magA) || 1;
        const normalizedLive = liveVector.map(x => x / magA);

        // Cosine similarity
        const enrolled = this.enrolledVoiceprint.features;
        let dot = 0;
        for (let i = 0; i < featureDim; i++) {
          dot += normalizedLive[i] * enrolled[i];
        }
        const similarity = Math.max(0, Math.min(1, dot));
        const verified = similarity >= this.threshold;

        return {
          verified,
          score: Math.round(similarity * 100),
          threshold: Math.round(this.threshold * 100)
        };
      }
    };
  }

  stopMicrophone() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
  }

  setEnrolled(voiceprint) {
    this.enrolledVoiceprint = voiceprint;
  }

  isEnrolled() {
    return Boolean(this.enrolledVoiceprint && Array.isArray(this.enrolledVoiceprint.features));
  }
}

export const voiceprintEngine = new VoiceprintEngine();
