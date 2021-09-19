/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.gecko.media;

import androidx.annotation.NonNull;
import android.util.Log;

import java.util.ArrayList;

public final class GeckoPlayerFactory {
    public static final ArrayList<BaseHlsPlayer> sPlayerList = new ArrayList<BaseHlsPlayer>();

    synchronized static BaseHlsPlayer getPlayer() {
        try {
            final Class<?> cls = Class.forName("org.mozilla.gecko.media.GeckoHlsPlayer");
            final BaseHlsPlayer player = (BaseHlsPlayer) cls.newInstance();
            sPlayerList.add(player);
            return player;
        } catch (final Exception e) {
            Log.e("GeckoPlayerFactory", "Class GeckoHlsPlayer not found or failed to create", e);
        }
        return null;
    }

    synchronized static BaseHlsPlayer getPlayer(final int id) {
        for (final BaseHlsPlayer player : sPlayerList) {
            if (player.getId() == id) {
                return player;
            }
        }
        Log.w("GeckoPlayerFactory", "No player found with id : " + id);
        return null;
    }

    synchronized static void removePlayer(final @NonNull BaseHlsPlayer player) {
        final int index = sPlayerList.indexOf(player);
        if (index >= 0) {
            sPlayerList.remove(player);
            Log.d("GeckoPlayerFactory", "HlsPlayer with id(" + player.getId() + ") is removed.");
        }
    }
}
