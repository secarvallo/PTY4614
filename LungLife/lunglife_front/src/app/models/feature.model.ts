// Modelo para features mostradas en la página Home
export interface Feature {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string; // ionic color key
  ariaLabel?: string;
}

