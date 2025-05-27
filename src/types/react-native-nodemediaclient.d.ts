declare module 'react-native-nodemediaclient' {
  import { ViewProps } from 'react-native';
  import { Component } from 'react';

  interface NodeCameraViewProps extends ViewProps {
    outputUrl: string;
    camera?: {
      cameraId?: number;
      cameraFrontMirror?: boolean;
    };
    audio?: {
      bitrate?: number;
      profile?: number;
      samplerate?: number;
    };
    video?: {
      preset?: number;
      bitrate?: number;
      profile?: number;
      fps?: number;
      videoFrontMirror?: boolean;
    };
    smoothSkinLevel?: number;
    autopreview?: boolean;
    onStatus?: (code: number, msg: string) => void;
  }

  export class NodeCameraView extends Component<NodeCameraViewProps> {
    start(): void;
    stop(): void;
    switchCamera(): void;
  }
} 