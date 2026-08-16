export type ScanMode = 'rapid' | 'standard' | 'deep';

export type RestoreResult = {
  filename: string;
  scan_mode: ScanMode;
  model: string;
  device: string;
  source_image: string;
  restored_image: string;
  original_shape?: [number, number];
  input_shape: [number, number];
  output_shape: [number, number];
  resized_for_speed?: boolean;
  max_input_dimension?: number;
  inference_ms?: number;
  stats: {
    input_min: number;
    input_max: number;
    output_min: number;
    output_max: number;
  };
};

export type RestoreErrorResult = {
  filename: string;
  error: string;
};

export type RestoreBatchResponse = {
  scan_mode: ScanMode;
  count: number;
  results: Array<RestoreResult | RestoreErrorResult>;
};

const API_BASE_URL = 'https://semicon-hackathon.onrender.com';

export async function restoreBatch(
  files: File[],
  scanMode: ScanMode
): Promise<RestoreBatchResponse> {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('files', file);
  });

  formData.append('scan_mode', scanMode);

  const url = `${API_BASE_URL}/api/restore-batch`;

  console.log('Calling backend:', url);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    console.log('Backend response:', response.status);

    if (!response.ok) {
      let message = `Backend request failed (${response.status})`;

      try {
        const data = await response.json();

        if (typeof data.detail === 'string') {
          message = data.detail;
        }
      } catch {
        message = response.statusText || message;
      }

      throw new Error(message);
    }

    return await response.json();
  } catch (error) {
    console.error('Backend request error:', error);
    throw error;
  }
}
