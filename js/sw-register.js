(function registerMoonServiceWorker(){
  const protocol = window.location.protocol;
  const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  const canRegister = protocol === "https:" || (protocol === "http:" && isLocalhost);

  if (protocol === "https:" || protocol === "http:") {
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "manifest.webmanifest";
    document.head.appendChild(link);
  }

  if (!("serviceWorker" in navigator)) return;

  if (!canRegister) {
    if (protocol === "file:") console.info("Service Worker skipped for file://.");
    return;
  }

  window.addEventListener("load", function(){
    navigator.serviceWorker.register("./sw.js").catch(function(err){
      console.warn("Service Worker registration failed.", err);
    });
  });
})();
