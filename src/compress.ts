import sharp, { FormatEnum } from 'sharp'

export const compress = async (
  file: string,
  options: {
    format: keyof FormatEnum
  } = {
    format: 'webp',
  }
) => {
  const { format } = options
  const { density, width } = await sharp(file).metadata()

  let sharpFile = await sharp(file)

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
