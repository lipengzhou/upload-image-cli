import * as sharp from 'sharp'

export const compress = async (
  file: string,
  options: {
    format: 'jpeg' | 'png' | 'webp' | 'gif' | 'svg' | 'tiff' | 'avif' | 'heif' | 'jp2'
  } = {
    format: 'webp',
  }
): Promise<Buffer> => {
  const { format } = options
  const instance = (sharp as any).default ? (sharp as any).default(file) : sharp(file)
  const { density, width } = await instance.metadata()

  let sharpFile = instance

  if (density && width) {
    sharpFile = sharpFile.resize({
      width: density >= 100 ? Math.floor(width / 2) : width,
    })
  }

  const buffer = sharpFile
    .toFormat(format, {
      quality: 80,
    })
    .toBuffer()

  return buffer
}
