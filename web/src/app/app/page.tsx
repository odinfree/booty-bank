import BankApp from "../../components/bank-app";
import SiteHeader from "../../components/site-header";

export default function AccountPage() {
  return <main className="bank-route"><SiteHeader /><div className="bank-route-label"><span>SAMPLE BANKING / LIVE WALLET ACTIONS REQUIRE APPROVAL</span><a href="/">BACK HOME ×</a></div><BankApp /></main>;
}
