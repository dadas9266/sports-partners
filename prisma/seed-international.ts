import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Uluslararası ülke, şehir ve ilçe verilerini seed eder.
 * Tümü upsert kullandığı için güvenle tekrar çalıştırılabilir.
 */
async function main() {
  console.log("🌍 Uluslararası lokasyon verileri ekleniyor...\n");

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

  let totalCountries = 0;
  let totalCities = 0;
  let totalDistricts = 0;

  for (const country of internationalData) {
    const dbCountry = await prisma.country.upsert({
      where: { code: country.code },
      update: {},
      create: { name: country.name, code: country.code },
    });
    totalCountries++;

    for (const [cityName, districtNames] of Object.entries(country.cities)) {
      const dbCity = await prisma.city.upsert({
        where: { name_countryId: { name: cityName, countryId: dbCountry.id } },
        update: {},
        create: { name: cityName, countryId: dbCountry.id },
      });
      totalCities++;

      for (const distName of districtNames) {
        await prisma.district.upsert({
          where: { name_cityId: { name: distName, cityId: dbCity.id } },
          update: {},
          create: { name: distName, cityId: dbCity.id },
        });
        totalDistricts++;
      }
    }
    console.log(`  ✅ ${country.name} (${country.code}): ${Object.keys(country.cities).length} şehir`);
  }

  console.log(`\n🎉 Toplam: ${totalCountries} ülke, ${totalCities} şehir, ${totalDistricts} ilçe eklendi!`);
}

main()
  .catch((e) => {
    console.error("❌ Hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
