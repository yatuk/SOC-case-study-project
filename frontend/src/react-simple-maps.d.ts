declare module 'react-simple-maps' {
  import * as React from 'react';

  export interface ComposableMapProps {
    width?: number;
    height?: number;
    projection?: string | ((width: number, height: number, config: any) => any);
    projectionConfig?: any;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }

  export class ComposableMap extends React.Component<ComposableMapProps, any> {}

  export interface GeographiesProps {
    geography?: string | Record<string, any> | string[];
    children: (args: { geographies: any[] }) => React.ReactNode;
  }

  export class Geographies extends React.Component<GeographiesProps, any> {}

  export interface GeographyProps {
    geography?: any;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
    onClick?: (event: React.MouseEvent<SVGGElement, MouseEvent>) => void;
    onMouseEnter?: (event: React.MouseEvent<SVGGElement, MouseEvent>) => void;
    onMouseLeave?: (event: React.MouseEvent<SVGGElement, MouseEvent>) => void;
    onMouseDown?: (event: React.MouseEvent<SVGGElement, MouseEvent>) => void;
    onMouseUp?: (event: React.MouseEvent<SVGGElement, MouseEvent>) => void;
    onFocus?: (event: React.FocusEvent<SVGGElement>) => void;
    onBlur?: (event: React.FocusEvent<SVGGElement>) => void;
  }

  export class Geography extends React.Component<GeographyProps, any> {}

  export interface MarkerProps {
    coordinates: [number, number];
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
    children?: React.ReactNode;
    onClick?: (event: React.MouseEvent<SVGGElement, MouseEvent>) => void;
    onMouseEnter?: (event: React.MouseEvent<SVGGElement, MouseEvent>) => void;
    onMouseLeave?: (event: React.MouseEvent<SVGGElement, MouseEvent>) => void;
    onMouseDown?: (event: React.MouseEvent<SVGGElement, MouseEvent>) => void;
    onMouseUp?: (event: React.MouseEvent<SVGGElement, MouseEvent>) => void;
    onFocus?: (event: React.FocusEvent<SVGGElement>) => void;
    onBlur?: (event: React.FocusEvent<SVGGElement>) => void;
  }

  export class Marker extends React.Component<MarkerProps, any> {}

  export interface LineProps {
    from: [number, number];
    to: [number, number];
    coordinates?: [number, number][];
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    strokeLinecap?: string;
    strokeOpacity?: number;
    children?: React.ReactNode;
  }

  export class Line extends React.Component<LineProps, any> {}
}
