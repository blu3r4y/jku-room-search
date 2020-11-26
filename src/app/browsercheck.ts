/**
 * Check if the user is using Internet Explorer
 */
export function isInternetExplorer(): boolean {
  const ua = navigator.userAgent;
  return ua.indexOf("MSIE ") > -1 || ua.indexOf("Trident/") > -1;
}

/**
 * Checks if the current browser is supported
 * and displays a message if not
 */
export function checkBrowser(): boolean {
  if (isInternetExplorer()) {
    const element = document.getElementById("iesupport");
    if (element !== null) element.style.display = "block";
    return false;
  }

  return true;
}
