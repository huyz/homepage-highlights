/**
 * 2025-01-28 Initial version by @ryanwinter at https://github.com/gethomepage/homepage/discussions/4619#discussioncomment-11981070
 */

function WatchItem(service, container, threshold) {
    this.service = service;
    this.container = container;
    this.threshold = threshold;

}
var watchItems = [
    new WatchItem('Portainer', 1, ">0"),
    new WatchItem('Uptime Kuma', 1, ">0"),
    new WatchItem('Healthchecks.io', 1, ">0"),
    new WatchItem('Uptime Robot', 1, ">0"),
    new WatchItem('Crowdsec', 1, ">0"),
    new WatchItem('Omada', 2, ">0"),
    new WatchItem('NetAlertX', 3, ">0"),
    new WatchItem('Truenas', 2, ">0"),
    new WatchItem('Scrutiny', 1, ">0"),
    new WatchItem('Scrutiny', 2, ">0"),
];

async function observeItem(item) {
    await waitForItem(item);

    item.element = document.querySelector(`[data-name='${item.service}']`).querySelector(".service-container").children[item.container];

    const observer = new MutationObserver(function (item, mutations) {
        mutations.forEach(function (mutation) {
            if (eval(`${mutation.target.data}${item.threshold}`)) {
                item.element.classList.add("fail-bg");
            } else {
                item.element.classList.remove("fail-bg");
            }
        });
    }.bind(null, item));

    observer.observe(item.element, { subtree: true, characterData: true });
}

function waitForItem(item) {
    return new Promise(resolve => {

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(`[data-name='${item.service}']`).querySelector(".service-container")) {
                observer.disconnect();
                resolve();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    });
}

watchItems.forEach(item => {
    observeItem(item);
});
