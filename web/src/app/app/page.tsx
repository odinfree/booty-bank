import BankApp from "../../components/bank-app";
import SiteHeader from "../../components/site-header";

export default function AccountPage() {
  return <main className="bank-route"><SiteHeader /><div className="bank-route-label"><span>ACCOUNT / INTERACTIVE PROTOTYPE</span><a href="/">CLOSE ACCOUNT DEMO ×</a></div><BankApp /></main>;
}
