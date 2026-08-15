import BankApp from "../../components/bank-app";
import SiteHeader from "../../components/site-header";

export default function AccountPage() {
  return <main className="bank-route"><SiteHeader /><div className="bank-route-label"><span>ACCOUNT / SAMPLE DATA / NO FUNDS MOVE</span><a href="/">CLOSE FILE ×</a></div><BankApp /></main>;
}
