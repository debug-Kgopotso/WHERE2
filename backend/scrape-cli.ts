import { loadEnvConfig } from "@next/env";
import { runEventScraper } from "./scrape-events";

loadEnvConfig(process.cwd());

runEventScraper()
  .then((result) => {
    console.info("Event scraper completed", result);
    if (result.failedCities === result.cities.length) process.exitCode = 1;
  })
  .catch((error: unknown) => {
    console.error("Event scraper run failed", error);
    process.exitCode = 1;
  });
