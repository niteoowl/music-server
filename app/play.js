// api/play.js
export default async function handler(req, res) {
  const { videoId } = req.query; // 노래의 고유 ID를 받습니다.

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Piped API를 사용하여 비디오의 스트리밍 정보를 가져옵니다.
    const response = await fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`);
    const data = await response.json();

    // 오디오 파일들 중 가장 음질이 좋은 것을 골라 클라이언트에 전달합니다.
    const audioStream = data.audioStreams[0].url;
    res.status(200).json({ url: audioStream });
  } catch (error) {
    res.status(500).json({ error: '재생 주소를 가져오지 못했습니다.' });
  }
}
