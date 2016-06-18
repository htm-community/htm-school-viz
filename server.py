import web

urls = (
    "/", "Index"
)
app = web.application(urls, globals())

class Index:

    def GET(self):
        return "Hello."


if __name__ == "__main__":
    app.run()
