import React, { useState, useEffect } from 'react';
import Link from 'react-router-dom/Link';
import axios from 'axios';
import ContentLoader from 'react-content-loader';
import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  List,
  Avatar,
  Button,
  Input,
  Select,
  Icon,
} from 'antd';
import { CURSEMETA_API_URL } from '../../constants';
import { numberToRoundedWord } from '../../utils/numbers';
import * as downloadManagerActions from '../../actions/downloadManager';
import styles from './CurseModpacksBrowser.scss';

function CurseModpacksBrowser(props) {

  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('Featured');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPacks();
  }, [filterType])

  const loadPacks = async (reset = true) => {
    setLoading(true);
    const loadingArr = [...new Array(15)].map(() => ({ loading: true, name: null }));
    if (reset === true) setPacks(loadingArr);
    else setPacks(packs.concat(loadingArr));

    const res = await axios.get(
      `${CURSEMETA_API_URL}/direct/addon/search?gameId=432&pageSize=15&index=${
      packs.length}&sort=${filterType}&searchFilter=${encodeURI(searchQuery)}&categoryId=0&sectionId=4471&sortDescending=${filterType !==
      'author' && filterType !== 'name'}`
    );
    // We now remove the previous 15 elements and add the real 15
    const data = reset === true ? res.data : packs.concat(res.data);
    setPacks(data); console.log(packs);

    setLoading(false);
  };


  const loadMore =
    !loading && packs.length !== 0 ? (
      <div
        style={{
          textAlign: 'center',
          marginTop: 12,
          height: 32,
          lineHeight: '32px'
        }}
      >
        <Button onClick={() => loadPacks(false)}>Load More</Button>
      </div>
    ) : null;

  const filterChanged = async value => {
    setFilterType(value);
  };

  const onSearchChange = e => {
    setSearchQuery(e.target.value);
  };

  const onSearchSubmit = async () => {
    loadPacks(true);
  };

  const emitEmptySearchText = async () => {
    setSearchQuery('');
  };

  const downloadLatest = (modpackData) => {
    console.log(modpackData);
    props.addCursePackToQueue('test', modpackData.id, modpackData.defaultFileId)
  };

  if (!loading && packs.length === 0 && searchQuery.length === 0) {
    return (
      <h1 style={{ textAlign: 'center', paddingTop: '20%', height: 'calc(100vh - 60px)', background: 'var(--secondary-color-2)' }}>
        Servers are not currently available. Try again later
    </h1>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 60px)', background: 'var(--secondary-color-1)' }}>
      <div className={styles.header}>
        <Input
          placeholder="Search Here"
          onChange={onSearchChange}
          onPressEnter={onSearchSubmit}
          style={{ width: 200 }}
          value={searchQuery}
          suffix={
            searchQuery !== '' ? (
              <span onClick={emitEmptySearchText} role="button">
                <Icon
                  type="close-circle"
                  theme="filled"
                  style={{ cursor: 'pointer', color: '#999' }}
                />
              </span>
            ) : null
          }
        />
        <div>
          Sort By{' '}
          <Select
            defaultValue="featured"
            onChange={filterChanged}
            style={{ width: 150 }}
          >
            <Select.Option value="featured">Featured</Select.Option>
            <Select.Option value="popularity">Popularity</Select.Option>
            <Select.Option value="lastupdated">Last Updated</Select.Option>
            <Select.Option value="name">Name</Select.Option>
            <Select.Option value="author">Author</Select.Option>
            <Select.Option value="totaldownloads">
              Total Downloads
              </Select.Option>
          </Select>
        </div>
      </div>
      <div style={{ height: 'calc(100% - 52px)', display: 'flex', justifyContent: 'center' }}>
        <List
          className={styles.modsContainer}
          itemLayout="horizontal"
          loadMore={loadMore}
          dataSource={packs}
          renderItem={item => (
            <List.Item
              actions={[
                !item.loading &&
                <Link
                  to={{
                    pathname: `/curseModpackBrowserCreatorModal/${item.id}`,
                    state: { modal: true }
                  }}
                >
                  <Button type="primary" icon="download">Download</Button>
                </Link>,
                !item.loading && <Button type="primary">Explore <Icon type="arrow-right" /></Button>
              ]}
            >
              {item.loading ? (
                <ContentLoader
                  height={100}
                  speed={0.6}
                  primaryColor="var(--secondary-color-2)"
                  secondaryColor="var(--secondary-color-3)"
                  style={{
                    height: '100px'
                  }}
                >
                  <circle cx="17" cy="40" r="17" />
                  <rect
                    x="45"
                    y="0"
                    rx="0"
                    ry="0"
                    width={Math.floor(Math.random() * 80) + 150}
                    height="20"
                  />
                  <rect
                    x="45"
                    y="30"
                    rx="0"
                    ry="0"
                    width={Math.floor(Math.random() * 150) + 250}
                    height="16"
                  />
                  <rect
                    x="45"
                    y="50"
                    rx="0"
                    ry="0"
                    width={Math.floor(Math.random() * 150) + 250}
                    height="16"
                  />
                </ContentLoader>
              ) : (
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        src={
                          item.loading
                            ? ''
                            : item.attachments
                              ? item.attachments[0].thumbnailUrl
                              : 'https://www.curseforge.com/Content/2-0-6836-19060/Skins/CurseForge/images/anvilBlack.png'
                        }
                      />
                    }
                    title={<Link
                      to={{
                        pathname: ``,
                        state: { modal: true }
                      }}
                      replace
                    >
                      {item.name}
                    </Link>}
                    description={
                      item.loading ? (
                        ''
                      ) : (
                          <div>
                            <span style={{ maxWidth: 'calc(100% - 100px)' }}>
                              {/* Truncate the text if over 30 words */}
                              {item.summary.length >= 100 ? `${item.summary.slice(0, 100)}...` : item.summary}
                            </span>
                            <div className={styles.modFooter}>
                              <span>
                                Downloads: {numberToRoundedWord(item.downloadCount)}
                              </span>
                              <span>
                                Updated:{' '}
                                {new Date(
                                  item.latestFiles[0].fileDate
                                ).toLocaleDateString('en-US', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                        )
                    }
                  />
                )}
            </List.Item>
          )}
        />
      </div>
    </div>
  );
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ ...downloadManagerActions }, dispatch);
}

export default connect(null, mapDispatchToProps)(CurseModpacksBrowser);