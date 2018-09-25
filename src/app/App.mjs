/**
 *
 * @param {Window} window
 * @param {Document} document
 * @param {fetch} fetch
 * @param {UniversalRouter} UniversalRouter
 * @param {History} History
 * @returns {{new(): App, prototype: App}}
 */
export default function AppFactory(window, document, fetch, UniversalRouter, History) {
  return class App {
    /**
     *
     * @param {Array<{path: String, action: Function<Promise>}>} routes
     * @param {String} baseUrl
     * @param {String} contentSelector
     * @param {Function} onError [console.error]
     */
    constructor(routes, baseUrl='/', contentSelector='#content', onError=console.error) {
      // dependencies
      this.window = window;
      this.document = document;
      this.fetch = fetch;
      this.router = new UniversalRouter(routes);
      this.history = History.createBrowserHistory();

      this.init = () => {
        this.history.listen(location => {
          this.router.resolve(location.pathname)
            .then(template => this.render(template))
            .catch(onError)
        });
      };
      this.render = template => {
        this.document.querySelector(contentSelector).innerHTML = template;
      };
    }
  }
};