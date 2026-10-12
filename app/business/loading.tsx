import { BusinessLoadingScene } from "./_components/BusinessFeedback";

export default function BusinessLoading() {
  return <main id="main-content" className="page business-page business-loading" aria-busy="true"><BusinessLoadingScene titleId="business-loading-title" /></main>;
}
