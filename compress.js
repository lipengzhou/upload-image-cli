const sharp = require('sharp')

exports.compress = async (
  file,
  options = {
    format: 'webp',
  }
) => {
  const { format } = options
  const { density, width } = await sharp(file).metadata()
  const buffer = await sharp(file)
    .resize({
      width: density >= 100 ? Number.parseInt(width / 2) : width,
    })
    .toFormat(format, {
      quality: 80,
    })
    .toBuffer()

  return buffer
}
