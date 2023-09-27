# database.md

database = {
    users: {
        {user uid from firebase}: {
            timestamp: {yyyy-mm-dd H:i:s},
            nickname: {nickname},
            hashnum: {hashnum},
            email: {email},
            previous_versions: {},
        }
    },
    oneshots: {
        {oneshot-guid}: {
            timestamp: {yyyy-mm-dd H:i:s},
            owner: {user uid of the game master},
            date: {yyyy-mm-dd},
            place: {
                address: {string},
                lat: {float},
                lng: {float},
            },
            title: {string},
            description: {long string},
            time: {H:i:s},
            max_players: {int},
            out_players: {int},
            characters_level: {int},
            extra_info: {string},
            is_deleted: {bool},
            previous_versions: {}
        }
    },
    participations: {
        {participation-guid}: {
            timestamp: {yyyy-mm-dd H:i:s},
            oneshot: {oneshot uid},
            user: {user uid},
            status: {enum: present, tentative, leave},
            previous_versions: {}
        }
    },
    notificationsSent: {
        {notification uid}: {
            timestamp: {yyyy-mm-dd H:i:s},
            type: {string},
            notificationSubscription: {notificationSubscription uid},
            data: {json}
            sentViaToken: bool,
            sentViaEmail: bool
        }
    },
    notificationsSubscription: {
        {notificationSubscription uid}: {
            type: {string},
            user: {user uid},
            token: {token},
            email: {email},
            ----------------------
            when: {
                {weekday}: {
                    {hour}: {bool},
                }
            },
            where: {
                place: {google maps string},
                radius: {int}
            }
        }
    },
    ratings: {
        {rating-guid}: {
            timestamp: {yyyy-mm-dd H:i:s},
            to: {user uid},
            as: {enum: master, player},
            from: {user uid},
            rating: {enum: 1, 2, 3, 4, 5},
            description: {long string},
            is_deleted: {bool},
            previous_versions: {}
        }
    }
}