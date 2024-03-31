import { Injectable } from '@angular/core';

declare global {
  interface Window {
    onSpotifyIframeApiReady: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class SpotifyService {
  constructor() { }

  IFrameAPI?: any;
  EmbedController?: any;
  latestUri?: any;
  interval: any;
  position: number = 0;
  duration: number = 30;

  loadSpotifyApi() {
    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    script.onload = () => this.scriptLoaded();
    document.body.appendChild(script);
  }

  scriptLoaded() {
    window.onSpotifyIframeApiReady = (iframe: any) => {
      console.log('Spotify IFrame API Loaded');
      this.IFrameAPI = iframe;
    };
  }

  destroy() {
    if (!this.latestUri) return;
    this.EmbedController?.destroy();
    document.getElementById('spotify-space')?.remove();
    this.latestUri = undefined;
    this.EmbedController = undefined;
  }

  seek(seek: number) {
    this.EmbedController?.seek(seek);
  }

  update(uri: any) {
    if (uri == this.latestUri) return;
    if (this.EmbedController) {
      this.latestUri = uri;
      this.EmbedController.loadUri(uri);

    } else if (this.IFrameAPI) {
      const div = document.createElement('div');
      document.getElementById('spotify')?.appendChild(div);
      const br = document.createElement('br');
      br.id = 'spotify-space';
      document.getElementById('spotify')?.appendChild(br);
      this.IFrameAPI.createController(div, {
        width: '358',
        height: '80',
        uri: uri
      }, (e: any) => {
        this.EmbedController = e;
        this.EmbedController.addListener('playback_update', (e: any) => {
          this.duration = Number((e.data.duration / 1000).toFixed(0))
          this.position = e.data.position;
        })
        this.latestUri = uri;
      });
    }
  }
}