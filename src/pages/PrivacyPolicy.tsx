import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { salonConfig } from '@/config/salon';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Wróć na stronę główną
        </Link>

        <h1 className="font-heading text-3xl font-bold mb-2">Polityka prywatności</h1>
        <p className="text-sm text-muted-foreground mb-10">{salonConfig.name} &middot; Ostatnia aktualizacja: styczeń 2025</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-lg font-semibold mb-3">1. Administrator danych osobowych</h2>
            <p className="text-muted-foreground leading-relaxed">
              Administratorem danych osobowych jest <strong>{salonConfig.name}</strong> z siedzibą pod adresem <strong>{salonConfig.address}</strong>, tel. <strong>{salonConfig.phone}</strong>.
              W sprawach związanych z ochroną danych osobowych można kontaktować się pod wskazanymi powyżej danymi kontaktowymi.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Jakie dane zbieramy</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">W ramach działalności salonu przetwarzamy następujące dane osobowe:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Imię i nazwisko klienta</li>
              <li>Numer telefonu</li>
              <li>Historia wizyt (daty, rodzaje zabiegów)</li>
              <li>Notatki dotyczące świadczonych usług</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Cel i podstawa przetwarzania</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Dane osobowe przetwarzamy w następujących celach:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>Realizacja umowy</strong> — rezerwacja i realizacja wizyt (art. 6 ust. 1 lit. b RODO)</li>
              <li><strong>Przypomnienia SMS</strong> — wysyłanie powiadomień o nadchodzącej wizycie (art. 6 ust. 1 lit. a RODO — zgoda)</li>
              <li><strong>Prawnie uzasadniony interes</strong> — prowadzenie historii wizyt i obsługa klienta (art. 6 ust. 1 lit. f RODO)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Okres przechowywania danych</h2>
            <p className="text-muted-foreground leading-relaxed">
              Dane osobowe przechowujemy przez okres niezbędny do realizacji celów, dla których zostały zebrane — nie dłużej niż 3 lata od ostatniej wizyty, chyba że przepisy prawa wymagają dłuższego okresu przechowywania.
              Na Twój wniosek dane zostaną usunięte wcześniej, o ile nie sprzeciwiają się temu przepisy prawa.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Odbiorcy danych</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Twoje dane mogą być przekazywane następującym podmiotom przetwarzającym:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>Google Firebase</strong> — przechowywanie danych (serwery w UE), Google LLC, polityka prywatności: firebase.google.com/support/privacy</li>
              <li><strong>TextBee</strong> — wysyłanie przypomnień SMS, wyłącznie gdy wyraziłeś zgodę na przypomnienia</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">Dane nie są przekazywane do państw trzecich poza Europejskim Obszarem Gospodarczym.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Twoje prawa</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Przysługują Ci następujące prawa w zakresie ochrony danych osobowych:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>Dostęp</strong> — prawo do uzyskania informacji o przetwarzanych danych</li>
              <li><strong>Sprostowanie</strong> — prawo do poprawienia nieprawidłowych danych</li>
              <li><strong>Usunięcie</strong> — prawo do żądania usunięcia danych („prawo do bycia zapomnianym")</li>
              <li><strong>Ograniczenie</strong> — prawo do ograniczenia przetwarzania</li>
              <li><strong>Przenoszenie</strong> — prawo do otrzymania danych w ustrukturyzowanym formacie</li>
              <li><strong>Sprzeciw</strong> — prawo do wniesienia sprzeciwu wobec przetwarzania</li>
              <li><strong>Cofnięcie zgody</strong> — w każdej chwili, bez wpływu na zgodność z prawem wcześniejszego przetwarzania</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Aby skorzystać z powyższych praw, skontaktuj się z nami telefonicznie lub osobiście w salonie.
              Masz również prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (uodo.gov.pl).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Pliki cookie</h2>
            <p className="text-muted-foreground leading-relaxed">
              Strona internetowa salonu nie używa plików cookie służących do śledzenia ani profilowania. Używane są wyłącznie techniczne pliki cookie niezbędne do działania aplikacji (sesja logowania dla pracowników).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Bezpieczeństwo danych</h2>
            <p className="text-muted-foreground leading-relaxed">
              Stosujemy odpowiednie środki techniczne i organizacyjne w celu ochrony danych osobowych przed nieuprawnionym dostępem, utratą lub zniszczeniem. Dostęp do danych mają wyłącznie upoważnieni pracownicy salonu.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Wróć na stronę główną
          </Link>
        </div>
      </div>
    </div>
  );
}
