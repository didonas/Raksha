import { useState, useEffect, useCallback, useRef } from 'react';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number | null;
  error: string | null;
  loading: boolean;
  isWatching: boolean;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

const defaultOptions: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000,
  watch: false,
};

export function useGeolocation(options: GeolocationOptions = defaultOptions) {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    altitude: null,
    speed: null,
    heading: null,
    timestamp: null,
    error: null,
    loading: true,
    isWatching: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const opts = { ...defaultOptions, ...options };

  const onSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      speed: position.coords.speed,
      heading: position.coords.heading,
      timestamp: position.timestamp,
      error: null,
      loading: false,
      isWatching: !!watchIdRef.current,
    });
  }, []);

  const onError = useCallback((error: GeolocationPositionError) => {
    let message = 'Location unavailable';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied. Please enable GPS.';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable.';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out.';
        break;
    }
    setState((prev) => ({ ...prev, error: message, loading: false }));
  }, []);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by this browser.',
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: opts.enableHighAccuracy,
      timeout: opts.timeout,
      maximumAge: opts.maximumAge,
    });
  }, [onSuccess, onError, opts.enableHighAccuracy, opts.timeout, opts.maximumAge]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) return;
    if (watchIdRef.current !== null) return;

    setState((prev) => ({ ...prev, isWatching: true }));
    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: opts.enableHighAccuracy,
      timeout: opts.timeout,
      maximumAge: opts.maximumAge,
    });
  }, [onSuccess, onError, opts.enableHighAccuracy, opts.timeout, opts.maximumAge]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setState((prev) => ({ ...prev, isWatching: false }));
    }
  }, []);

  useEffect(() => {
    getLocation();
    if (opts.watch) {
      startWatching();
    }
    return () => {
      stopWatching();
    };
  }, []);

  return {
    ...state,
    getLocation,
    startWatching,
    stopWatching,
    isSupported: !!navigator.geolocation,
  };
}

export default useGeolocation;
