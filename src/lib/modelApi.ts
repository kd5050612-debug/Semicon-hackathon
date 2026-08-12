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

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

export async function restoreBatch(files: File[], scanMode: ScanMode): Promise<RestoreBatchResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  formData.append('scan_mode', scanMode);

  const response = await fetch(`${API_BASE_URL}/api/restore-batch`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let message = `Backend request failed (${response.status})`;
    try {
      const data = await response.json();
      message = typeof data.detail === 'string' ? data.detail : message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return response.json();
}
