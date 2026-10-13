const VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY!
const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`

const LABEL_TRANSLATIONS: Record<string, string> = {
  // 自然・地形
  Mountain: '山',
  Sea: '海',
  Ocean: '海',
  Beach: 'ビーチ',
  Forest: '森',
  River: '川',
  Lake: '湖',
  Sky: '空',
  Cloud: '雲',
  Sunset: '夕日',
  Sunrise: '朝日',
  Snow: '雪',
  Waterfall: '滝',
  Desert: '砂漠',
  Island: '島',
  Park: '公園',
  Garden: '庭園',
  Field: '野原',
  Hill: '丘',
  Valley: '谷',
  // 都市・建物
  City: '都市',
  Building: '建物',
  Architecture: '建築',
  Bridge: '橋',
  Tower: '塔',
  Castle: '城',
  Temple: '寺社',
  Shrine: '神社',
  Church: '教会',
  Museum: '美術館・博物館',
  Stadium: 'スタジアム',
  Airport: '空港',
  Station: '駅',
  Street: '街並み',
  Road: '道路',
  Highway: '高速道路',
  // 食べ物・飲み物
  Food: '食べ物',
  Restaurant: 'レストラン',
  Meal: '食事',
  Sushi: '寿司',
  Ramen: 'ラーメン',
  Pizza: 'ピザ',
  Dessert: 'デザート',
  Cake: 'ケーキ',
  Coffee: 'コーヒー',
  Drink: '飲み物',
  Beer: 'ビール',
  Wine: 'ワイン',
  // 動物
  Animal: '動物',
  Dog: '犬',
  Cat: '猫',
  Bird: '鳥',
  Fish: '魚',
  Horse: '馬',
  Deer: '鹿',
  Monkey: '猿',
  // 乗り物
  Car: '車',
  Train: '電車',
  Bus: 'バス',
  Boat: '船',
  Airplane: '飛行機',
  Bicycle: '自転車',
  Motorcycle: 'バイク',
  // 活動・イベント
  Festival: '祭り',
  Concert: 'コンサート',
  Sport: 'スポーツ',
  Hiking: 'ハイキング',
  Swimming: '水泳',
  Shopping: 'ショッピング',
  // 自然現象・植物
  Flower: '花',
  Tree: '木',
  Grass: '草',
  Autumn: '紅葉',
  Cherry: '桜',
  Night: '夜景',
  Fireworks: '花火',
  // その他
  Landmark: 'ランドマーク',
  Tourist: '観光',
  Souvenir: 'お土産',
  Hotel: 'ホテル',
  Camping: 'キャンプ',
}

function translateLabel(label: string): string {
  return LABEL_TRANSLATIONS[label] || label
}

export async function analyzeImageWithVision(imageBase64: string): Promise<string[]> {
  try {
    const response = await fetch(VISION_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'LANDMARK_DETECTION', maxResults: 3 },
            ],
          },
        ],
      }),
    })

    const data = await response.json()
    const result = data.responses?.[0]
    const tags: string[] = []

    const landmarks = result?.landmarkAnnotations || []
    for (const lm of landmarks) {
      if (lm.score > 0.6) tags.push(lm.description)
    }

    const labels = result?.labelAnnotations || []
    for (const label of labels) {
      if (label.score > 0.75) {
        const translated = translateLabel(label.description)
        if (!tags.includes(translated)) tags.push(translated)
      }
    }

    return tags.slice(0, 6)
  } catch (error) {
    console.error('Vision API error:', error)
    return []
  }
}
