declare module "mammoth" {
  type RawTextResult = {
    value: string;
    messages: Array<{ type: string; message: string }>;
  };

  const mammoth: {
    extractRawText(options: { arrayBuffer: ArrayBuffer }): Promise<RawTextResult>;
  };

  export default mammoth;
}
