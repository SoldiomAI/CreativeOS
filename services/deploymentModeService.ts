/**
 * Deployment mode — local filesystem, RunPod serverless, or GCP Cloud Run.
 */

import { DeploymentMode } from '../types/contentFactory';

const LS = {
  mode: 'creativeos_scf_deploy_mode',
  runpodKey: 'creativeos_runpod_api_key',
  runpodEndpoint: 'creativeos_runpod_endpoint_id',
  gcpRunUrl: 'creativeos_gcp_cloud_run_url',
  gcpBucket: 'creativeos_gcp_storage_bucket',
  elevenlabsKey: 'creativeos_elevenlabs_api_key',
};

const read = (k: string) => {
  try {
    return localStorage.getItem(k) || '';
  } catch {
    return '';
  }
};

const write = (k: string, v: string) => {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
};

export const getDeploymentMode = (): DeploymentMode => {
  const stored = read(LS.mode) as DeploymentMode;
  if (stored === 'runpod' || stored === 'gcp' || stored === 'local') return stored;
  const env = import.meta.env.VITE_SCF_DEPLOY_MODE as string | undefined;
  if (env === 'runpod' || env === 'gcp') return env;
  return 'local';
};

export const setDeploymentMode = (mode: DeploymentMode) => write(LS.mode, mode);

export const getRunpodApiKey = () => read(LS.runpodKey);
export const setRunpodApiKey = (v: string) => write(LS.runpodKey, v.trim());
export const getRunpodEndpointId = () => read(LS.runpodEndpoint);
export const setRunpodEndpointId = (v: string) => write(LS.runpodEndpoint, v.trim());

export const getGcpCloudRunUrl = () => read(LS.gcpRunUrl);
export const setGcpCloudRunUrl = (v: string) => write(LS.gcpRunUrl, v.trim());
export const getGcpStorageBucket = () => read(LS.gcpBucket);
export const setGcpStorageBucket = (v: string) => write(LS.gcpBucket, v.trim());

export const getElevenlabsApiKey = () => read(LS.elevenlabsKey);
export const setElevenlabsApiKey = (v: string) => write(LS.elevenlabsKey, v.trim());

export const DEPLOYMENT_MODES: { id: DeploymentMode; label: string; blurb: string }[] = [
  {
    id: 'local',
    label: 'Local',
    blurb: 'Projects on disk + Pillow/FFmpeg on this machine',
  },
  {
    id: 'runpod',
    label: 'RunPod',
    blurb: 'Metadata local; GPU render via RunPod serverless endpoint',
  },
  {
    id: 'gcp',
    label: 'GCP',
    blurb: 'Cloud Run render worker + optional GCS object storage',
  },
];
