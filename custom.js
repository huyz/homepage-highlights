const DEFAULT_CLASSNAME = "alert-danger";

const WATCH_ITEMS = [
  //// Generally errors

  new WatchItem('UptimeRobot', 0, "!=Up"),
  new WatchItem('Healthchecks.io', 1, ">0"),
  new WatchItem('Healthchecks', 1, ">0"),

  new WatchItem('Prometheus', 1, ">0"),
  new WatchItem('Grafana', 2, ">0"),
  new WatchItem('Grafana', 3, ">0"),

  new WatchItem('Caddy', 2, ">0"),
  new WatchItem('Portainer', 1, ">0"),
  // 2025-08-04 Crowdsec widget is broken
  // https://github.com/gethomepage/homepage/discussions/3472
  //new WatchItem('Crowdsec', 0, ">0", {classname: 'alert-warning'}),
  new WatchItem('Crowdsec', 1, ">0"),
  new WatchItem('Technitium', 1, ">0"),
  new WatchItem('Uptime Kuma', 1, ">0"),
  new WatchItem('Watchtower', 2, ">0"),

  //// Generally warnings

  // Cloudflare
  new WatchItem('Cloudflare', 0, "!=Healthy", {
    classname: 'alert-warning',
    matchSelector: '[data-name^="CF:"]',
    expectedMatches: 8,
  }),

  // Tailscale: "Now" and "…s Ago" are both ok, so exclude everything else using a regular expression
  new WatchItem('Tailscale' , 1, "!~ ^Now$|s Ago$", {
    classname: 'alert-warning',
    matchSelector: '[data-name^="TS:"]',
    expectedMatches: 5,
  }),

  //// INFO: items to process

  new WatchItem('Paperless', 0, ">0", {classname: 'alert-info'}),
  new WatchItem('Changedetection', 0, ">0", {classname: 'alert-info'}),

  //// Other examples

  //new WatchItem('UPS', 0, "!=On-Line"),
  //new WatchItem('UPS', 1, ">80"),
  //new WatchItem('UPS', 2, "<100"),
  //new WatchItem('UPS', 3, ">40"),
  //new WatchItem('Proxmox PBS1', 0, ">80"),
  //new WatchItem('Proxmox PBS1', 1, ">0"),
  //new WatchItem('Proxmox PBS1', 2, ">80"),
  //new WatchItem('Proxmox PBS1', 3, ">80"),
  //new WatchItem('Proxmox Cluster', 2, ">80"),
  //new WatchItem('Proxmox Cluster', 3, ">80"),
  //new WatchItem('TrueNAS', 2, ">0"),
  //new WatchItem('BackupTrueNAS', 2, ">0"),
  //new WatchItem('Portainer Docker PVE VM1', 1, ">0"),
  //new WatchItem('Portainer Docker PVE VM2', 1, ">0"),
  //new WatchItem('Portainer Docker TN VM1', 1, ">0"),
  //new WatchItem('Portainer Docker TN VM2', 1, ">0"),
  //new WatchItem('Zabbix', 2, ">0"),
  //new WatchItem('Zabbix', 3, ">0"),

  //new WatchItem('Portainer', 1, ">0"),
  //new WatchItem('Uptime Kuma', 1, ">0"),
  //new WatchItem('Healthchecks.io', 1, ">0"),
  //new WatchItem('Uptime Robot', 1, ">0"),
  //new WatchItem('Crowdsec', 1, ">0"),
  //new WatchItem('Omada', 2, ">0"),
  //new WatchItem('NetAlertX', 3, ">0"),
  //new WatchItem('Truenas', 2, ">0"),
  //new WatchItem('Scrutiny', 1, ">0"),
  //new WatchItem('Scrutiny', 2, ">0"),
];

/**
 *
 * @param {*} options.matchSelector - By default, this app looks for a service that matches by name.
 *    This option allows you to specify a custom selector, which is particularly useful
 *    if you have several instances of widgets for the same service.
 * @param {*} options.expectedMatches - How many matches to look for (and add observers to).
 *    It's important to set this accurately to cover all intended widgets while avoiding
 *    wasting CPU cycles on unnecessary observers.
 */
function WatchItem(service, cellIndex, threshold, options) {
  this.service = service;
  this.cellIndex = cellIndex;
  this.classname = options?.classname ?? DEFAULT_CLASSNAME;
  this.matchSelector = options?.matchSelector ?? `[data-name="${this.service}"]`;
  this.expectedMatches = options?.expectedMatches ?? 1;

  // Parse operator and value from the threshold string, e.g., ">0"
  const match = threshold.match(/(==|!=|>=|<=|>|<|=~|!~)(.+)/);
  if (!match) throw new Error(`Invalid threshold format: ${threshold}`);

  this.operator = match[1];
  this.threshold = match[2].trim();
}

function compareValues(current, threshold, operator) {
  // Try to coerce to numbers; fallback to strings
  const numCurrent = parseFloat(current);
  const numThreshold = parseFloat(threshold);

  const useNumbers = !isNaN(numCurrent) && !isNaN(numThreshold);

  const a = useNumbers ? numCurrent : current;
  const b = useNumbers ? numThreshold : threshold;

  switch (operator) {
    case "==": return a == b;
    case "!=": return a != b;
    case ">":  return a > b;
    case "<":  return a < b;
    case ">=": return a >= b;
    case "<=": return a <= b;
    case "=~": return a.match(new RegExp(b));
    case "!~": return !a.match(new RegExp(b));
    default:
    console.error(`Unsupported operator: ${operator}`);
    return false;
  }
}

async function observeItem(item) {
  for (let i = 0; i < item.expectedMatches; ++i) {
    // First, wait until the item is rendered in the page DOM
    const cell = await waitForItem(item, i, i == item.expectedMatches - 1);
    /* Debugging
    if (i == 0) {
    console.log(`${item.matchSelector}: ✅`);
    } else {
      console.log(`${item.matchSselector}: waiting for ${item.expectedMatches - i - 1} more`);
    }
    */

    // Now we can get at the appropriate cell
    const element = cell.children[item.cellIndex];

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        const currentValue = mutation.target.data;

        element.classList.forEach(cls => {
          if (cls.startsWith("alert-")) {
            element.classList.remove(cls);
          }
        });

        if (compareValues(currentValue, item.threshold, item.operator)) {
          element.classList.add(item.classname);
        }

        // Re-highlight the box that is being observed because Homepage has re-created it
        element.classList.add('observed-for-alerts');
      });
    });

    // We only care about the first line in hte cell
    const valueElement = element.children[0];
    observer.observe(valueElement, { subtree: true, characterData: true });

    // Highlight the boxes that are being observed
    element.classList.add('observed-for-alerts');
  }
}

/**
* Wait for the item to be added to the page DOM, in order to add the real observer
* on the cell's values.
*/
function waitForItem(item, matchNumber, disconnectWhenDone) {
  return new Promise(resolve => {
    const observer = new MutationObserver(() => {
      const matches = document.querySelectorAll(item.matchSelector);
      if (matches.length >= matchNumber + 1) {
        const cell = matches[matchNumber]?.querySelector(".service-container");
        // The cell is in the DOM, let's get this observer replaced.
        if (cell) {
          if (disconnectWhenDone) {
            // This is important to avoid wasted CPU cycles
            observer.disconnect();
          }
          resolve(cell);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

// Start observers
WATCH_ITEMS.forEach(observeItem);
