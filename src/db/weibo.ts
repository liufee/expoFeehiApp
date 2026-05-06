import * as SQLite from 'expo-sqlite';
import {Alert} from 'react-native';
import {AppDBBasePath} from '@/constants';

class Weibo{
    private db: SQLite.SQLiteDatabase | null = null;

    public constructor() {
    }

    public async init() {
        try {
            this.db = await SQLite.openDatabaseAsync( 'weibo' + (__DEV__ ? '_debug' : ''),undefined, AppDBBasePath);
            //await this.enableWal();
            await this.createTable();
        }catch (e) {
            Alert.alert('失败', JSON.stringify(e));
            return;
        }
    }

    public async reconnectDB(){
        if(!this.db){
            return;
        }
        await this.db.closeAsync();
        await this.init();
    }

    private async enableWal(){
        if (!this.db) return;
        const result = await this.db.getAllAsync('PRAGMA journal_mode=WAL;');
        console.log('Journal mode set to:', (result as any[])[0]?.journal_mode);
    }

    private async createTable(){
        if (!this.db) return;

        await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS feeds (
                id text,
                link_href text,
                url text,
                uid text,
                time datetime,
                content text,
                coordinates text,
                location text,
                comment_num integer,
                like_num integer,
                repost_num integer,
                by_id integer,
                retweet_id text,
                type integer DEFAULT 1,
                tsr integer DEFAULT 0,
                PRIMARY KEY (id)
            );
        `);

        await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS pictures (
                id integer,
                type text,
                third_id text,
                picture text,
                PRIMARY KEY (id)
            );
        `);

        await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS comments (
                id text,
                time datetime,
                like_num integer,
                content text,
                location text,
                reply_to text,
                feed_id text,
                user_id text,
                tsr integer DEFAULT 0,
                PRIMARY KEY (id)
            );
        `);

        await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS retweets (
                id text,
                link_href text,
                url text,
                uid text,
                time datetime,
                content text,
                coordinates text,
                location text,
                comment_num integer,
                like_num integer,
                repost_num integer,
                by_id integer,
                retweet_id text,
                PRIMARY KEY (id)
            );
        `);

        await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS bies (
                id integer,
                url text,
                title text,
                PRIMARY KEY (id)
            );
        `);

        await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS users (
                id text,
                name text,
                pic text,
                pic_local text,
                home_page text,
                PRIMARY KEY (id)
            );
        `);

        await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS likes (
                id integer,
                feed_id text,
                user_id text,
                count integer,
                PRIMARY KEY (id)
            );
        `);

        await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS been_reposts (
                id text,
                feed_id text,
                user_id text,
                content text,
                time datetime,
                href_link text,
                location text,
                url text,
                PRIMARY KEY (id)
            );
        `);

        await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS tsr (
                type text,
                third_id text,
                tsr,
                PRIMARY KEY (type, third_id)
            );
        `);
    }


    // 创建微博
    public async createWeibo(record){
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(
            'INSERT INTO feeds (id, link_href, url, uid, time, content, coordinates, location, comment_num, like_num, repost_num, by_id, retweet_id, type, tsr) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [record.id, record.link_href, record.url, record.uid, record.time, record.content, record.coordinates, record.location, record.comment_num, record.like_num, record.repost_num, record.by_id, record.retweet_id, record.type, record.tsr === '' ? 0 : 1]
        );

        for (let i in record.medias) {
            const media = record.medias[i];
            await this.db.runAsync(
                'INSERT INTO pictures (type, third_id, picture) VALUES (?, ?, ?)',
                [media.type, media.third_id, media.picture]
            );
        }

        if (record.tsr !== '') {
            await this.db.runAsync(
                'INSERT INTO tsr (type, third_id, tsr) VALUES (?, ?, ?)',
                ['feed', record.id, record.tsr]
            );
        }

        return true;
    }

    public async deleteWeibo(id){
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync('DELETE from feeds where id=?', [id]);
        await this.db.runAsync('DELETE from pictures where third_id=?', [id]);
        await this.db.runAsync('DELETE from comments where feed_id=?', [id]);
        await this.db.runAsync('DELETE from tsr where type="feed" and third_id=?', [id]);

        return true;
    };

    public async getWeiboByPage(uids:number[], page, offset, limit, types:string[], startDate?:string, endDate?:string, sortOrder:string = 'desc'){
        if (!this.db) throw new Error('Database not initialized');

        const uidStr = uids.join(',');
        const typesStr = types.join(',');
        let sql = `SELECT * FROM feeds where uid in (${uidStr}) and type in (${typesStr})`;
        let params: any[] = [];
        if (startDate) {
            sql += ' and time >= ?';
            params.push(startDate);
        }
        if (endDate) {
            sql += ' and time <= ?';
            params.push(endDate);
        }
        sql += ` ORDER BY time ${sortOrder}  limit ? offset ?`;
        params.push(limit);
        params.push(offset);

        const results = await this.db.getAllAsync(sql, params);
        return results;
    }

    public async getWeiboByPageWithKeyword (uids:number[], page, offset, limit, types:string[], keyword:string, startDate?:string, endDate?:string, sortOrder:string = 'desc'){
        if (!this.db) throw new Error('Database not initialized');

        const uidStr = uids.join(',');
        const typesStr = types.join(',');
        let sql = `SELECT feeds.*
             FROM feeds
                      left join retweets on feeds.retweet_id = retweets.id
                      left join comments on feeds.id = comments.feed_id
                      left join users on retweets.uid = users.id
             where feeds.uid in (${uidStr})
               and feeds.type in (${typesStr})
               and (
                 feeds.content like ? or retweets.content like ? or comments.content like ? or users.name like ?
                 )
             `;
        let params: any[] = ['%' + keyword + '%', '%' + keyword + '%', '%' + keyword + '%', '%' + keyword + '%'];
        if (startDate) {
            sql += ' and feeds.time >= ?';
            params.push(startDate);
        }
        if (endDate) {
            sql += ' and feeds.time <= ?';
            params.push(endDate);
        }
        sql += ` GROUP BY feeds.id ORDER BY feeds.time ${sortOrder} limit ? offset ?`;
        params.push(limit);
        params.push(offset);

        const results = await this.db.getAllAsync(sql, params);
        return results;
    }

    public async getWeibo(feedId){
        if (!this.db) throw new Error('Database not initialized');

        const results = await this.db.getAllAsync(`SELECT * FROM feeds where id=?`, [feedId]);
        return results;
    }

    public async getAttachments(type: string, thirdIds: string[]){
        if (!this.db) throw new Error('Database not initialized');

        const thirdIdsStr = thirdIds.map(id => `'${id}'`).join(', ');
        const results = await this.db.getAllAsync(
            `SELECT * FROM pictures where type=? and third_id in (${thirdIdsStr})`,
            [type]
        );
        return results;
    }

    public async getRetweets(repostIds: string[]){
        if (!this.db) throw new Error('Database not initialized');

        const repostIdsStr = repostIds.map(id => `'${id}'`).join(', ');
        const results = await this.db.getAllAsync(
            `SELECT * FROM feeds where id in (${repostIdsStr})`,
            []
        );
        return results;
    }

    public async getUsers(userIds: string[]){
        if (!this.db) throw new Error('Database not initialized');

        const userIdsStr = userIds.map(id => `'${id}'`).join(', ');
        const results = await this.db.getAllAsync(
            `SELECT * FROM users where id in (${userIdsStr})`,
            []
        );
        return results;
    };

    public async getRetweetsCompatible(retweetIds: string[]) {
        if (!this.db) throw new Error('Database not initialized');

        const retweetIdsStr = retweetIds.map(id => `'${id}'`).join(', ');
        const results = await this.db.getAllAsync(
            `SELECT * FROM retweets where id in (${retweetIdsStr})`,
            []
        );
        return results;
    };

    public async IncrWeibo(field, feedId){
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(
            `update feeds set ${field}=${field}+1 where id=?`,
            [feedId]
        );
        return true;
    };

    public async saveComment(record){
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(
            `INSERT INTO comments(id, time, like_num, content, location, reply_to, feed_id, user_id, tsr) VALUES(?,?,?,?,?,?,?,?, ?)`,
            [record.id,  record.time, record.like_num, record.content, record.location, record.reply_to, record.feed_id, record.user_id, record.tsr === '' ? 0 : 1]
        );

        for (let i in record.medias) {
            const media = record.medias[i];
            await this.db.runAsync(
                'INSERT INTO pictures (type, third_id, picture) VALUES (?, ?, ?)',
                [media.type, media.third_id, media.picture]
            );
        }

        if (record.tsr !== '') {
            await this.db.runAsync(
                'INSERT INTO tsr (type, third_id, tsr) VALUES (?, ?, ?)',
                ['comment', record.id, record.tsr]
            );
        }

        return true;
    }

    public async getComments(feedId: string){
        if (!this.db) throw new Error('Database not initialized');

        const results = await this.db.getAllAsync(
            `SELECT * FROM comments where feed_id=? order by time desc`,
            [feedId]
        );
        return results;
    }

    public async getCommentsByIds(ids: string[]) {
        if (!this.db) throw new Error('Database not initialized');

        const idsStr = ids.join(',');
        const results = await this.db.getAllAsync(
            `SELECT * FROM comments where id in (${idsStr})`,
            []
        );
        return results;
    }

    public async getBies(){
        if (!this.db) throw new Error('Database not initialized');

        const results = await this.db.getAllAsync(`SELECT * FROM bies`, []);
        return results;
    }

    public async getLikes(feedId: string) {
        if (!this.db) throw new Error('Database not initialized');

        const results = await this.db.getAllAsync(
            `SELECT * FROM likes where feed_id=?`,
            [feedId]
        );
        return results;
    }

    public async getBeenReposted(feedId: string){
        if (!this.db) throw new Error('Database not initialized');

        const results = await this.db.getAllAsync(
            `SELECT * FROM been_reposts where feed_id=?`,
            [feedId]
        );
        return results;
    }

    public async getTSR(type:string, id: string){
        if (!this.db) throw new Error('Database not initialized');

        const results = await this.db.getAllAsync(
            `SELECT * FROM tsr where type=? and third_id=?`,
            [type, id]
        );
        return results;
    }
}

export const weiboDB = new Weibo();

