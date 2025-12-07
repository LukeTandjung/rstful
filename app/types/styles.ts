export type ThreeTenColors = {
  accent: string;
  gray: string;
  background: string;
};

export type Base16Colors = {
  base1: string;
  base2: string;
  base3: string;
  base4: string;
  base5: string;
  base6: string;
  base7: string;
  base8: string;
  base9: string;
  base10: string;
  base11: string;
  base12: string;
  base13: string;
  base14: string;
  base15: string;
  base16: string;
};

export type FormState = {
  palette_type: string;
  palette: {
    name?: string;
    description?: string;
    colors: ThreeTenColors | Base16Colors;
  };
};
