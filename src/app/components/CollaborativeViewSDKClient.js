const clientId = process.env.NEXT_PUBLIC_ADOBE_CLIENT_ID;

class CollaborativeViewSDKClient {
    constructor(paperURL, userInfo) {
        this.paperURL = paperURL;
        this.userInfo = userInfo;
        this.readyPromise = new Promise((resolve) => {
            if (window.AdobeDC) {
                resolve();
            } else {
                /* Wait for Adobe Acrobat Services PDF Embed API to be ready */
                document.addEventListener("adobe_dc_view_sdk.ready", () => {
                    resolve();
                });
            }
        });
        this.adobeDCView = undefined;
    }

    ready() {
        return this.readyPromise;
    }

    previewFile(divId, viewerConfig) {
        console.log('previewFile paperURL: ', this.paperURL);
        const config = {
            /* Pass your registered client id */
            clientId: clientId,
        };
        if (divId) { /* Optional only for Light Box embed mode */
            /* Pass the div id in which PDF should be rendered */
            config.divId = divId;
        }
        /* Initialize the AdobeDC View object */
        this.adobeDCView = new window.AdobeDC.View(config);

        /* Invoke the file preview API on Adobe DC View object */
        const previewFilePromise = this.adobeDCView.previewFile({
            /* Pass information on how to access the file */
            content: {
                /* Location of file where it is hosted */
                location: {
                    url: this.paperURL,
                    /*
                    If the file URL requires some additional headers, then it can be passed as follows:-
                    headers: [
                        {
                            key: "<HEADER_KEY>",
                            value: "<HEADER_VALUE>",
                        }
                    ]
                    */
                },
            },
            /* Pass meta data of file */
            metaData: {
                /* file name */
                fileName: this.paperURL
                ? this.paperURL.substring(this.paperURL.lastIndexOf("/") + 1)
                : "2403.08715",
                /* file ID */
                id: "6d07d124-ac85-43b3-a867-36930f502ac6",
            }
        }, viewerConfig);

        return previewFilePromise;
    }

    registerUserProfileApiHandler() {
        const profile = {
            userProfile: {
                name: this.userInfo.name,
                firstName: this.userInfo.firstName,
                lastName: this.userInfo.lastName,
                email: this.userInfo.email,
            },
        };

        this.adobeDCView.registerCallback(
            window.AdobeDC.View.Enum.CallbackType.GET_USER_PROFILE_API,
            () => {
                return new Promise((resolve) => {
                    resolve({
                        code: window.AdobeDC.View.Enum.ApiResponseCode.SUCCESS,
                        data: profile,
                    });
                });
            },
            {}
        );
    }

    registerEventsHandler() {
        /* Register the callback to receive the events */
        this.adobeDCView.registerCallback(
            /* Type of call back */
            window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
            /* call back function */
            event => {
                console.log('CollaborativeViewSDKClient: ', event);
            },
            /* options to control the callback execution */
            {
                /* Enable PDF analytics events on user interaction. */
                enablePDFAnalytics: true,
            }
        );
    }
}

export default CollaborativeViewSDKClient;