const mongoose = require('mongoose')
const { connectDB } = require('../config/database')
require('dotenv').config()

const Task = require('../models/Task')
const SystemSetting = require('../models/SystemSetting')

const seedData = async () => {
  await connectDB()

  const settings = [
    { key: 'max_daily_submissions_per_user', value: 10, description: 'Max submissions per user per day' },
    { key: 'min_trust_score_to_submit', value: 0, description: 'Minimum trust score required to submit' },
  ]

  for (const s of settings) {
    await SystemSetting.updateOne({ key: s.key }, { $set: s }, { upsert: true })
  }
  console.log('✅ System settings seeded')

  const igboPrompts = [
    'Ụtụtụ ọma, kedu ka ị mere taa? A na m atụ anya na ị nọ ọfụma.',
    'Aha m bụ Ada, a na m esi n\'obodo nta pụta. Anyị na-akụ ji na ede.',
    'Bịa ka anyị gaa ahịa ugbu a. Anyị chọrọ ịzụta akwụkwọ nri.',
    'Nna m na-arụ ọrụ n\'ubi kwa ụbọchị. Ọ na-akụ osikapa na ọka.',
    'Ụmụaka na-agụ akwụkwọ na mahadum. Ha na-amụ ihe nke ọma.',
    'Ego adịghị mfe ịnweta n\'oge a. Anyị ga-arụsị ọrụ ike.',
    'Mmiri ozuzo na-ezo oge ọkọchị. Ala anyị na-amị mkpụrụ nke ọma.',
    'Nwanne m nwanyị lụrụ di ọhụrụ n\'izu gara aga. Emume ahụ mara mma.',
    'Anyị nwere ụlọ akwụkwọ ọhụrụ n\'obodo anyị. Ụmụaka nwere obi ụtọ.',
    'Oge ntụrụndụ erutela, ụmụaka ga-eji obi ụtọ gaa n\'ụlọ.',
    'Nri Igbo dị ụtọ nke ukwuu. Ofe onugbu bụ nri kachasị masị m.',
    'Anyị na-asụ Igbo n\'ụlọ anyị. Ọ dị mkpa ka anyị chekwaa asụsụ anyị.',
  ]

  const hausaPrompts = [
    'Barka da zuwa kasuwa. Muna da sabbin tumatir, barkono, da albasa don sayarwa.',
    'Ilimi yana da matukar muhimmanci ga kowane yaro. Dole ne mu tura yaranmu makaranta.',
    'Yau rana ta yi kyau sosai. Iska mai dadi tana kadawa a wannan safiya.',
    'Ina son abincin Hausa sosai. Tuwo da miyan kuka shine fi son na.',
    'Mahaifina manomi ne. Yana noman dawa da gero a gonar mu.',
    'Abokan mu sun zo ziyarar mu jiya. Mun yi musu kyakkyawan tarba.',
    'Ruwan sama ya yi da yawa a bana. Masara ta yi kyau sosai.',
    'Yara suna wasa a filin wasa. Suna murna da annashuwa.',
    'Muna bukatar mu kula da lafiyar mu. Shan ruwa da yawa yana da muhimmanci.',
    'Kasuwar Kurmi tana da kayan saye masu yawa. Mutane suna zuwa daga ko ina.',
    'Shirin talabijin ya fara da misalin karfe bakwai. Kowa yana saurare.',
    'Hutun karshen mako ya yi da dadi. Mun tafi bakin teku.',
  ]

  const pidginPrompts = [
    'I go market yesterday go buy chop. The price don go up again but we still need make we chop food.',
    'The football match sweet well well. Our team score three goals win the game. Everybody dey celebrate.',
    'My mama dey cook jollof rice for house. The smell sweet, e reach everywhere for the compound.',
    'I no fit sleep last night because say mosquito dey bite me. I go buy net tomorrow.',
    'School don close for holiday. The pikin dem happy well well, dem dey play outside.',
    'Rain fall heavy yesterday. Water enter some people house, dem no fit stay inside.',
    'My friend get new phone. E dey show everybody for street, the phone fine no be small.',
    'We go church on Sunday. Pastor preach well well, everybody shout hallelujah.',
    'Traffic hold us for road today. We stay for bus stop like two hours before bus come.',
    'Na early morning be the best time to exercise. I dey jog every morning before work.',
    'Mama say make I go fetch water for well. The sun hot but I still go.',
    'My brother don graduate from university. The whole family happy, we do party.',
  ]

  const makeTask = (language, text, index) => ({
    language,
    title: `${language.charAt(0).toUpperCase() + language.slice(1)} Prompt`,
    description: `Read the ${language.charAt(0).toUpperCase() + language.slice(1)} text below aloud and record your voice clearly.`,
    type: 'audio',
    sourceText: text,
    category: 'general',
    rewardAmount: 0.2,
    difficulty: 'easy',
    minTextLength: 0,
    maxTextLength: 500,
    audioRequired: true,
    minAudioDuration: 2,
    maxAudioDuration: 30,
    isActive: true,
    order: index,
  })

  const tasks = [
    ...igboPrompts.map((t, i) => makeTask('igbo', t, i)),
    ...hausaPrompts.map((t, i) => makeTask('hausa', t, i)),
    ...pidginPrompts.map((t, i) => makeTask('pidgin', t, i)),
  ]

  await Task.deleteMany({})
  await Task.insertMany(tasks)
  console.log(`✅ ${tasks.length} sample tasks seeded`)

  console.log('🎉 Seed complete')
  process.exit(0)
}

seedData().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
