import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed işlemi başlatılıyor...");

  // Sporlar
  const sporlarListesi = [
    { name: "Futbol", icon: "⚽" },
    { name: "Basketbol", icon: "🏀" },
    { name: "Tenis", icon: "🎾" },
    { name: "Voleybol", icon: "🏐" },
    { name: "Masa Tenisi", icon: "🏓" },
    { name: "Yüzme", icon: "🏊" },
    { name: "Koşu", icon: "🏃" },
    { name: "Yürüyüş", icon: "🚶" },
    { name: "Bisiklet", icon: "🚲" },
    { name: "Kaykay / Paten", icon: "🛹" },
    { name: "Squash", icon: "🎾" },
    { name: "Pickleball", icon: "🎾" },
    { name: "Padel", icon: "🎾" },
    { name: "Balık Tutma", icon: "🎣" },
    { name: "Hiking (Doğa Yürüyüşü)", icon: "🥾" },
    { name: "Bilardo", icon: "🎱" },
    { name: "Dart", icon: "🎯" },
    { name: "Yoga / Pilates", icon: "🧘" },
    { name: "Fitness", icon: "💪" },
  ];

  const sporlar = [];
  for (const s of sporlarListesi) {
    const created = await prisma.sport.upsert({
      where: { name: s.name },
      update: { icon: s.icon },
      create: s,
    });
    sporlar.push(created);
  }
  console.log(`✅ ${sporlar.length} spor/aktivite dalı hazır`);

  // Ülke
  const turkiye = await prisma.country.upsert({
    where: { code: "TR" },
    update: {},
    create: { name: "Türkiye", code: "TR" },
  });

  // ─── 81 İL VERİSİ ────────────────────────────────────────────────────────
  const illerData: Record<string, string[]> = {
    "Adana": ["Seyhan", "Yüreğir", "Çukurova", "Sarıçam", "Ceyhan", "Kozan"],
    "Adıyaman": ["Merkez", "Besni", "Kahta", "Gölbaşı"],
    "Afyonkarahisar": ["Merkez", "Sandıklı", "Dinar", "Bolvadin"],
    "Ağrı": ["Merkez", "Doğubayazıt", "Patnos"],
    "Aksaray": ["Merkez", "Ortaköy"],
    "Amasya": ["Merkez", "Merzifon", "Suluova"],
    "Ankara": ["Çankaya", "Keçiören", "Mamak", "Yenimahalle", "Altındağ", "Sincan", "Etimesgut", "Pursaklar", "Beypazarı"],
    "Antalya": ["Muratpaşa", "Kepez", "Konyaaltı", "Alanya", "Manavgat", "Serik", "Aksu"],
    "Ardahan": ["Merkez"],
    "Artvin": ["Merkez", "Hopa"],
    "Aydın": ["Efeler", "Nazilli", "Söke", "Kuşadası", "Didim"],
    "Balıkesir": ["Altıeylül", "Karesi", "Bandırma", "Edremit", "Ayvalık"],
    "Bartın": ["Merkez"],
    "Batman": ["Merkez"],
    "Bayburt": ["Merkez"],
    "Bilecik": ["Merkez", "Bozüyük"],
    "Bingöl": ["Merkez"],
    "Bitlis": ["Merkez", "Tatvan"],
    "Bolu": ["Merkez", "Gerede"],
    "Burdur": ["Merkez", "Bucak"],
    "Bursa": ["Osmangazi", "Yıldırım", "Nilüfer", "Gemlik", "İnegöl", "Mudanya", "Gürsu"],
    "Çanakkale": ["Merkez", "Biga", "Gelibolu", "Çan"],
    "Çankırı": ["Merkez"],
    "Çorum": ["Merkez", "Alaca"],
    "Denizli": ["Pamukkale", "Merkezefendi", "Acıpayam"],
    "Diyarbakır": ["Bağlar", "Kayapınar", "Sur", "Yenişehir"],
    "Düzce": ["Merkez"],
    "Edirne": ["Merkez", "Keşan", "Uzunköprü"],
    "Elazığ": ["Merkez"],
    "Erzincan": ["Merkez"],
    "Erzurum": ["Yakutiye", "Palandöken", "Aziziye"],
    "Eskişehir": ["Odunpazarı", "Tepebaşı"],
    "Gaziantep": ["Şahinbey", "Şehitkamil", "Nizip", "İslahiye"],
    "Giresun": ["Merkez"],
    "Gümüşhane": ["Merkez"],
    "Hakkari": ["Merkez"],
    "Hatay": ["Antakya", "İskenderun", "Defne", "Dörtyol", "Kırıkhan"],
    "Iğdır": ["Merkez"],
    "Isparta": ["Merkez", "Yalvaç"],
    "İstanbul": ["Kadıköy", "Beşiktaş", "Üsküdar", "Şişli", "Bakırköy", "Fatih", "Beyoğlu", "Sarıyer", "Maltepe", "Pendik", "Ümraniye", "Bağcılar", "Bahçelievler", "Bayrampaşa", "Beylikdüzü", "Büyükçekmece", "Çekmeköy", "Esenler", "Esenyurt", "Eyüpsultan", "Gaziosmanpaşa", "Güngören", "Kağıthane", "Kartal", "Küçükçekmece", "Silivri", "Sultanbeyli", "Sultangazi", "Tuzla", "Zeytinburnu", "Arnavutköy", "Avcılar"],
    "İzmir": ["Konak", "Karşıyaka", "Bornova", "Buca", "Çiğli", "Gaziemir", "Balçova", "Karabağlar", "Bayraklı", "Narlıdere", "Güzelbahçe", "Urla", "Çeşme", "Torbalı"],
    "Kahramanmaraş": ["Dulkadiroğlu", "Onikişubat"],
    "Karabük": ["Merkez"],
    "Karaman": ["Merkez"],
    "Kars": ["Merkez"],
    "Kastamonu": ["Merkez"],
    "Kayseri": ["Kocasinan", "Melikgazi", "Talas", "Develi"],
    "Kırıkkale": ["Merkez"],
    "Kırklareli": ["Merkez", "Lüleburgaz"],
    "Kırşehir": ["Merkez"],
    "Kilis": ["Merkez"],
    "Kocaeli": ["İzmit", "Gebze", "Körfez", "Darıca", "Çayırova", "Başiskele"],
    "Konya": ["Meram", "Selçuklu", "Karatay", "Ereğli", "Akşehir"],
    "Kütahya": ["Merkez", "Tavşanlı"],
    "Malatya": ["Battalgazi", "Yeşilyurt"],
    "Manisa": ["Yunusemre", "Şehzadeler", "Akhisar", "Turgutlu", "Salihli"],
    "Mardin": ["Artuklu", "Kızıltepe", "Nusaybin"],
    "Mersin": ["Yenişehir", "Mezitli", "Toroslar", "Akdeniz", "Tarsus", "Erdemli"],
    "Muğla": ["Menteşe", "Bodrum", "Fethiye", "Marmaris", "Milas"],
    "Muş": ["Merkez"],
    "Nevşehir": ["Merkez", "Ürgüp"],
    "Niğde": ["Merkez", "Bor"],
    "Ordu": ["Altınordu", "Ünye", "Fatsa"],
    "Osmaniye": ["Merkez"],
    "Rize": ["Merkez", "Ardeşen"],
    "Sakarya": ["Adapazarı", "Serdivan", "Erenler", "Arifiye"],
    "Samsun": ["Atakum", "Canik", "İlkadım", "Tekkeköy"],
    "Siirt": ["Merkez"],
    "Sinop": ["Merkez"],
    "Sivas": ["Merkez"],
    "Şanlıurfa": ["Karaköprü", "Eyyübiye", "Haliliye", "Suruç", "Viranşehir"],
    "Şırnak": ["Merkez", "Cizre", "Silopi"],
    "Tekirdağ": ["Süleymanpaşa", "Çorlu", "Çerkezköy"],
    "Tokat": ["Merkez", "Erbaa", "Niksar"],
    "Trabzon": ["Ortahisar", "Akçaabat", "Arsin"],
    "Tunceli": ["Merkez"],
    "Uşak": ["Merkez"],
    "Van": ["İpekyolu", "Tuşba", "Edremit"],
    "Yalova": ["Merkez", "Çınarcık"],
    "Yozgat": ["Merkez", "Sorgun"],
    "Zonguldak": ["Merkez", "Ereğli", "Karadeniz Ereğlisi"],
  };

  const cityMap: Record<string, { id: string }> = {};
  const districtMap: Record<string, { id: string }> = {};

  for (const [ilAdi, ilceler] of Object.entries(illerData)) {
    const city = await prisma.city.upsert({
      where: { name_countryId: { name: ilAdi, countryId: turkiye.id } },
      update: {},
      create: { name: ilAdi, countryId: turkiye.id },
    });
    cityMap[ilAdi] = city;
    for (const ilce of ilceler) {
      const district = await prisma.district.upsert({
        where: { name_cityId: { name: ilce, cityId: city.id } },
        update: {},
        create: { name: ilce, cityId: city.id },
      });
      districtMap[`${ilAdi}:${ilce}`] = district;
    }
  }

  // Mevcut kodla uyumluluk için değişken takma adları
  const istanbul = cityMap["İstanbul"];
  const ankara = cityMap["Ankara"];
  const izmir = cityMap["İzmir"];
  const kadikoy = districtMap["İstanbul:Kadıköy"];
  const besiktas = districtMap["İstanbul:Beşiktaş"];
  const uskudar = districtMap["İstanbul:Üsküdar"];
  const sisli = districtMap["İstanbul:Şişli"];
  const bakirkoy = districtMap["İstanbul:Bakırköy"];
  const cankaya = districtMap["Ankara:Çankaya"];
  const kecioren = districtMap["Ankara:Keçiören"];
  const karsiyaka = districtMap["İzmir:Karşıyaka"];
  const bornova = districtMap["İzmir:Bornova"];

  console.log(`✅ 81 il ve ${Object.keys(districtMap).length} ilçe oluşturuldu`);

  // ─── ULUSLARARASI ÜLKELER ─────────────────────────────────────────────────
  const internationalData: { code: string; name: string; cities: Record<string, string[]> }[] = [
    {
      code: "DE", name: "Almanya",
      cities: {
        "Berlin": ["Mitte", "Kreuzberg", "Charlottenburg", "Neukölln", "Prenzlauer Berg", "Friedrichshain", "Tempelhof", "Spandau"],
        "München": ["Schwabing", "Sendling", "Giesing", "Bogenhausen", "Pasing", "Maxvorstadt"],
        "Hamburg": ["Altona", "Eimsbüttel", "Hamburg-Nord", "Wandsbek", "Bergedorf", "Harburg"],
        "Frankfurt": ["Altstadt", "Sachsenhausen", "Bockenheim", "Bornheim", "Nordend", "Westend"],
        "Köln": ["Innenstadt", "Ehrenfeld", "Lindenthal", "Nippes", "Mülheim", "Kalk"],
        "Stuttgart": ["Mitte", "Bad Cannstatt", "Vaihingen", "Zuffenhausen", "Degerloch"],
        "Düsseldorf": ["Altstadt", "Bilk", "Oberkassel", "Pempelfort", "Derendorf", "Flingern"],
        "Dortmund": ["Innenstadt", "Hörde", "Eving", "Aplerbeck", "Brackel"],
        "Essen": ["Rüttenscheid", "Steele", "Borbeck", "Werden", "Altenessen"],
        "Nürnberg": ["Altstadt", "Gostenhof", "Maxfeld", "Erlenstegen"],
      },
    },
    {
      code: "GB", name: "İngiltere",
      cities: {
        "Londra": ["Westminster", "Camden", "Islington", "Hackney", "Tower Hamlets", "Southwark", "Lambeth", "Greenwich", "Kensington"],
        "Manchester": ["City Centre", "Chorlton", "Didsbury", "Fallowfield", "Rusholme", "Salford"],
        "Birmingham": ["City Centre", "Edgbaston", "Moseley", "Erdington", "Solihull"],
        "Liverpool": ["City Centre", "Anfield", "Toxteth", "Wavertree", "Woolton"],
        "Leeds": ["City Centre", "Headingley", "Chapel Allerton", "Roundhay"],
        "Bristol": ["City Centre", "Clifton", "Redland", "Bedminster", "Cotham"],
        "Edinburgh": ["Old Town", "New Town", "Leith", "Morningside", "Stockbridge"],
        "Glasgow": ["City Centre", "West End", "Southside", "East End", "Finnieston"],
      },
    },
    {
      code: "FR", name: "Fransa",
      cities: {
        "Paris": ["1er Arrondissement", "Le Marais", "Montmartre", "Belleville", "Bastille", "Saint-Germain", "Champs-Élysées", "Ménilmontant"],
        "Marsilya": ["Vieux-Port", "La Joliette", "Le Panier", "Endoume", "Castellane"],
        "Lyon": ["Presqu'île", "Vieux Lyon", "Part-Dieu", "Croix-Rousse", "Guillotière"],
        "Nice": ["Vieux Nice", "Cimiez", "Port", "Libération", "Riquier"],
        "Toulouse": ["Capitole", "Saint-Cyprien", "Compans", "Rangueil", "Borderouge"],
        "Bordeaux": ["Saint-Pierre", "Chartrons", "Bastide", "Saint-Michel", "Nansouty"],
      },
    },
    {
      code: "NL", name: "Hollanda",
      cities: {
        "Amsterdam": ["Centrum", "De Pijp", "Jordaan", "Oost", "West", "Noord", "Zuid", "Nieuw-West"],
        "Rotterdam": ["Centrum", "Delfshaven", "Feijenoord", "Kralingen", "Charlois"],
        "Lahey": ["Centrum", "Scheveningen", "Loosduinen", "Segbroek"],
        "Utrecht": ["Binnenstad", "Lombok", "Overvecht", "Leidsche Rijn"],
        "Eindhoven": ["Centrum", "Strijp", "Woensel", "Tongelre"],
      },
    },
    {
      code: "US", name: "ABD",
      cities: {
        "New York": ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"],
        "Los Angeles": ["Hollywood", "Downtown", "Santa Monica", "Venice", "Silver Lake", "Echo Park"],
        "Chicago": ["Loop", "Lincoln Park", "Wicker Park", "Hyde Park", "Lakeview"],
        "Houston": ["Downtown", "Midtown", "Montrose", "Heights", "Galleria"],
        "Miami": ["Downtown", "South Beach", "Brickell", "Wynwood", "Little Havana", "Coral Gables"],
        "San Francisco": ["Mission", "SoMa", "Castro", "Marina", "Richmond", "Sunset"],
      },
    },
    {
      code: "AZ", name: "Azerbaycan",
      cities: {
        "Bakü": ["Yasamal", "Nasimi", "Sabail", "Binagadi", "Khazar", "Surakhani", "Nizami"],
        "Gence": ["Merkez", "Kapaz"],
        "Sumgayıt": ["Merkez"],
        "Şeki": ["Merkez"],
        "Lenkeran": ["Merkez"],
      },
    },
    {
      code: "RU", name: "Rusya",
      cities: {
        "Moskova": ["Arbat", "Tverskoy", "Zamoskvorechye", "Basmanny", "Khamovniki", "Presnensky", "Tagansky"],
        "St. Petersburg": ["Admiralteysky", "Vasileostrovsky", "Petrogradsky", "Tsentralny", "Moskovsky"],
        "Kazan": ["Vakhitovsky", "Novo-Savinovsky", "Sovetsky", "Privolzhsky"],
        "Soçi": ["Adler", "Khosta", "Tsentralny", "Lazarevskoye"],
      },
    },
    {
      code: "SA", name: "Suudi Arabistan",
      cities: {
        "Riyad": ["Al Olaya", "Al Malaz", "Al Murabba", "Al Sahafa", "Al Yasmin", "Irqah"],
        "Cidde": ["Al Balad", "Al Hamra", "Al Rawdah", "Al Safa", "Al Andalus"],
        "Mekke": ["Al Haram", "Al Aziziyah", "Al Shisha"],
        "Medine": ["Al Haram", "Quba", "Al Uyun"],
        "Dammam": ["Al Faisaliyah", "Al Shati", "Al Mazrouiyah"],
      },
    },
    {
      code: "IT", name: "İtalya",
      cities: {
        "Roma": ["Trastevere", "Monti", "Testaccio", "Prati", "Esquilino", "Flaminio"],
        "Milano": ["Navigli", "Brera", "Isola", "Lambrate", "Porta Romana", "Città Studi"],
        "Napoli": ["Centro Storico", "Vomero", "Chiaia", "Posillipo", "Fuorigrotta"],
        "Torino": ["Centro", "San Salvario", "Vanchiglia", "Aurora", "Crocetta"],
        "Firenze": ["Centro Storico", "Oltrarno", "Santa Croce", "San Lorenzo"],
      },
    },
    {
      code: "ES", name: "İspanya",
      cities: {
        "Madrid": ["Centro", "Salamanca", "Chamberí", "Retiro", "Lavapiés", "Malasaña"],
        "Barselona": ["Gràcia", "Eixample", "Ciutat Vella", "Sants", "Sant Martí", "Sarrià"],
        "Sevilla": ["Triana", "Santa Cruz", "Macarena", "Nervión", "Los Remedios"],
        "Valencia": ["Ciutat Vella", "L'Eixample", "Ruzafa", "El Cabanyal"],
      },
    },
    {
      code: "JP", name: "Japonya",
      cities: {
        "Tokyo": ["Shibuya", "Shinjuku", "Minato", "Chiyoda", "Meguro", "Setagaya", "Toshima"],
        "Osaka": ["Namba", "Umeda", "Tennoji", "Shinsekai", "Kitahama"],
        "Kyoto": ["Higashiyama", "Nakagyo", "Shimogyo", "Sakyo", "Kamigyo"],
      },
    },
    {
      code: "KR", name: "Güney Kore",
      cities: {
        "Seul": ["Gangnam", "Hongdae", "Myeongdong", "Itaewon", "Insadong", "Jongno"],
        "Busan": ["Haeundae", "Nampo", "Seomyeon", "Gwangalli"],
      },
    },
    {
      code: "BR", name: "Brezilya",
      cities: {
        "São Paulo": ["Pinheiros", "Vila Madalena", "Jardins", "Centro", "Moema", "Itaim Bibi"],
        "Rio de Janeiro": ["Copacabana", "Ipanema", "Leblon", "Botafogo", "Lapa", "Santa Teresa"],
      },
    },
    {
      code: "AR", name: "Arjantin",
      cities: {
        "Buenos Aires": ["Palermo", "Recoleta", "San Telmo", "La Boca", "Belgrano", "Microcentro"],
      },
    },
    {
      code: "EG", name: "Mısır",
      cities: {
        "Kahire": ["Zamalek", "Maadi", "Garden City", "Mohandessin", "Heliopolis", "Downtown"],
        "İskenderiye": ["Raml Station", "Stanley", "Montaza", "Sidi Gaber"],
      },
    },
    {
      code: "AU", name: "Avustralya",
      cities: {
        "Sidney": ["CBD", "Surry Hills", "Newtown", "Bondi", "Manly", "Darlinghurst"],
        "Melbourne": ["CBD", "Fitzroy", "South Yarra", "St Kilda", "Brunswick", "Carlton"],
      },
    },
    {
      code: "CA", name: "Kanada",
      cities: {
        "Toronto": ["Downtown", "Yorkville", "Kensington", "Liberty Village", "Queen West"],
        "Vancouver": ["Downtown", "Kitsilano", "Gastown", "Mount Pleasant", "Commercial Drive"],
        "Montreal": ["Plateau-Mont-Royal", "Mile End", "Old Port", "Griffintown", "Outremont"],
      },
    },
    {
      code: "IN", name: "Hindistan",
      cities: {
        "Mumbai": ["Bandra", "Andheri", "Colaba", "Dadar", "Juhu", "Worli"],
        "Delhi": ["Connaught Place", "Hauz Khas", "Dwarka", "Karol Bagh", "Lajpat Nagar"],
        "Bangalore": ["Koramangala", "Indiranagar", "Whitefield", "HSR Layout", "MG Road"],
      },
    },
    {
      code: "PK", name: "Pakistan",
      cities: {
        "İslamabad": ["F-6", "F-7", "G-9", "I-8", "Blue Area"],
        "Karaçi": ["Clifton", "DHA", "Saddar", "Gulshan", "North Nazimabad"],
        "Lahor": ["Gulberg", "DHA", "Model Town", "Johar Town", "Liberty"],
      },
    },
    {
      code: "GR", name: "Yunanistan",
      cities: {
        "Atina": ["Plaka", "Monastiraki", "Kolonaki", "Exarcheia", "Psiri", "Gazi"],
        "Selanik": ["Ladadika", "Ano Poli", "Kalamaria", "Toumba"],
      },
    },
    {
      code: "BG", name: "Bulgaristan",
      cities: {
        "Sofya": ["Center", "Lozenets", "Vitosha", "Studentski Grad", "Mladost"],
        "Varna": ["Center", "Primorski", "Asparuhovo"],
        "Plovdiv": ["Kapana", "Center", "Trakiya"],
      },
    },
    {
      code: "GE", name: "Gürcistan",
      cities: {
        "Tiflis": ["Old Town", "Vake", "Saburtalo", "Vera", "Didube", "Avlabari"],
        "Batum": ["Old Batumi", "New Boulevard", "Gonio"],
      },
    },
  ];

  for (const country of internationalData) {
    const dbCountry = await prisma.country.upsert({
      where: { code: country.code },
      update: {},
      create: { name: country.name, code: country.code },
    });

    for (const [cityName, districtNames] of Object.entries(country.cities)) {
      const dbCity = await prisma.city.upsert({
        where: { name_countryId: { name: cityName, countryId: dbCountry.id } },
        update: {},
        create: { name: cityName, countryId: dbCountry.id },
      });
      cityMap[cityName] = dbCity;

      for (const distName of districtNames) {
        const dbDistrict = await prisma.district.upsert({
          where: { name_cityId: { name: distName, cityId: dbCity.id } },
          update: {},
          create: { name: distName, cityId: dbCity.id },
        });
        districtMap[`${cityName}:${distName}`] = dbDistrict;
      }
    }
    console.log(`  ✅ ${country.name} (${country.code}): ${Object.keys(country.cities).length} şehir eklendi`);
  }
  console.log(`✅ ${internationalData.length} uluslararası ülke + şehir + ilçe eklendi`);

  // ─── ADMIN HESABI OLUŞTURMA ──────────────────────────────────────────
  const adminEmail = process.argv.find(arg => arg.includes("@")) || "admin@gmail.com";
  const adminPassword = process.argv[process.argv.indexOf(adminEmail) + 1] || "Admin123!";
  
  const adminHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      isAdmin: true,
      passwordHash: adminHash,
    },
    create: {
      name: "Sistem Yöneticisi",
      email: adminEmail,
      passwordHash: adminHash,
      isAdmin: true,
    },
  });
  console.log(`\n👑 Admin hesabı hazır: ${adminEmail} / ${adminPassword}`);

  // Mekanlar
  const venueData = [
    {
      name: "Kadıköy Spor Salonu",
      address: "Caferağa Mah. Moda Cad. No:12",
      districtId: kadikoy.id,
      sportId: sporlar[0].id,
    },
    {
      name: "Fenerbahçe Korları",
      address: "Fenerbahçe Parkı İçi",
      districtId: kadikoy.id,
      sportId: sporlar[2].id,
    },
    {
      name: "Beşiktaş Basketbol Sahası",
      address: "Barbaros Bulvarı Açık Saha",
      districtId: besiktas.id,
      sportId: sporlar[1].id,
    },
    {
      name: "Üsküdar Halı Saha",
      address: "Altunizade Mah.",
      districtId: uskudar.id,
      sportId: sporlar[0].id,
    },
    {
      name: "Şişli Spor Merkezi",
      address: "Mecidiyeköy Mah.",
      districtId: sisli.id,
      sportId: sporlar[0].id,
    },
    {
      name: "Bakırköy Yüzme Havuzu",
      address: "Ataköy Sahil",
      districtId: bakirkoy.id,
      sportId: sporlar[5].id, // Yüzme
    },
    {
      name: "Çankaya Tenis Kulübü",
      address: "Tunalı Hilmi Cad.",
      districtId: cankaya.id,
      sportId: sporlar[2].id,
    },
    {
      name: "Keçiören Spor Kompleksi",
      address: "Keçiören Belediyesi Tesisleri",
      districtId: kecioren.id,
      sportId: sporlar[1].id,
    },
    {
      name: "Karşıyaka Voleybol Sahası",
      address: "Karşıyaka Sahil",
      districtId: karsiyaka.id,
      sportId: sporlar[3].id,
    },
    {
      name: "Bornova Stadyumu",
      address: "Bornova Merkez",
      districtId: bornova.id,
      sportId: sporlar[0].id,
    },
  ];

  const mekanlar = [];
  for (const v of venueData) {
    const created = await prisma.venue.upsert({
      where: {
        name_districtId: {
          name: v.name,
          districtId: v.districtId,
        },
      },
      update: {
        address: v.address,
        sportId: v.sportId,
      },
      create: v,
    });
    mekanlar.push(created);
  }
  console.log(`✅ ${mekanlar.length} mekan oluşturuldu`);

  // Örnek kullanıcılar
  const hash = await bcrypt.hash("Test123!", 12);
  const user1 = await prisma.user.upsert({
    where: { email: "ahmet@test.com" },
    update: {},
    create: {
      name: "Ahmet Yılmaz",
      email: "ahmet@test.com",
      passwordHash: hash,
      phone: "05551112233",
    },
  });
  const user2 = await prisma.user.upsert({
    where: { email: "mehmet@test.com" },
    update: {},
    create: {
      name: "Mehmet Kaya",
      email: "mehmet@test.com",
      passwordHash: hash,
      phone: "05554445566",
    },
  });
  const user3 = await prisma.user.upsert({
    where: { email: "ayse@test.com" },
    update: {},
    create: {
      name: "Ayşe Demir",
      email: "ayse@test.com",
      passwordHash: hash,
    },
  });
  console.log("✅ 3 test kullanıcısı oluşturuldu (şifre: Test123!)");

  // Örnek ilanlar
  const now = new Date();
  const ilanlar = await Promise.all([
    prisma.listing.create({
      data: {
        type: "RIVAL",
        sportId: sporlar[0].id,
        districtId: kadikoy.id,
        venueId: mekanlar[0].id,
        userId: user1.id,
        dateTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        level: "INTERMEDIATE",
        description:
          "Cumartesi günü halı saha maçı için rakip takım arıyoruz. 7v7 oynayacağız.",
      },
    }),
    prisma.listing.create({
      data: {
        type: "PARTNER",
        sportId: sporlar[2].id,
        districtId: kadikoy.id,
        venueId: mekanlar[1].id,
        userId: user2.id,
        dateTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        level: "BEGINNER",
        description:
          "Tenise yeni başladım, birlikte antrenman yapacak partner arıyorum.",
      },
    }),
    prisma.listing.create({
      data: {
        type: "RIVAL",
        sportId: sporlar[1].id,
        districtId: besiktas.id,
        venueId: mekanlar[2].id,
        userId: user3.id,
        dateTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
        level: "ADVANCED",
        description:
          "3v3 basketbol maçı, ciddi oyuncular arıyoruz. Deneyimli olmanız tercih sebebi.",
      },
    }),
    prisma.listing.create({
      data: {
        type: "PARTNER",
        sportId: sporlar[0].id,
        districtId: uskudar.id,
        venueId: mekanlar[3].id,
        userId: user1.id,
        dateTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        level: "BEGINNER",
        description:
          "Haftasonu futbol oynamak isteyen arkadaşlar toplanıyoruz, seviye farketmez.",
      },
    }),
    prisma.listing.create({
      data: {
        type: "PARTNER",
        sportId: sporlar[3].id,
        districtId: karsiyaka.id,
        venueId: mekanlar[8].id,
        userId: user2.id,
        dateTime: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        level: "INTERMEDIATE",
        description: "Voleybol oynayacak 2 kişi arıyoruz, sahil voleybolu.",
      },
    }),
    prisma.listing.create({
      data: {
        type: "RIVAL",
        sportId: sporlar[2].id,
        districtId: cankaya.id,
        venueId: mekanlar[6].id,
        userId: user3.id,
        dateTime: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
        level: "INTERMEDIATE",
        description: "Tenis maçı yapmak istiyorum. Tek maç olarak düşünüyorum.",
      },
    }),
  ]);
  console.log(`✅ ${ilanlar.length} örnek ilan oluşturuldu`);

  // Örnek karşılıklar
  await prisma.response.create({
    data: {
      listingId: ilanlar[0].id,
      userId: user2.id,
      message: "Biz de 7 kişiyiz, maça hazırız!",
      status: "PENDING",
    },
  });
  await prisma.response.create({
    data: {
      listingId: ilanlar[0].id,
      userId: user3.id,
      message: "Takımımız eksik ama katılabiliriz.",
      status: "PENDING",
    },
  });
  await prisma.response.create({
    data: {
      listingId: ilanlar[1].id,
      userId: user1.id,
      message: "Ben de yeni başladım, beraber çalışalım!",
      status: "PENDING",
    },
  });
  console.log("✅ 3 örnek karşılık oluşturuldu");

  console.log("\n🎉 Seed işlemi tamamlandı!");
  console.log("Test hesapları:");
  console.log("  ahmet@test.com / Test123!");
  console.log("  mehmet@test.com / Test123!");
  console.log("  ayse@test.com / Test123!");
}

main()
  .catch((e) => {
    console.error("❌ Seed hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
