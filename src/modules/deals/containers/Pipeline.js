import React from 'react';
import PropTypes from 'prop-types';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { Spinner } from 'modules/common/components';
import { Alert } from 'modules/common/utils';
import { STORAGE_PIPELINE_KEY } from 'modules/common/constants';
import { Pipeline } from '../components';
import { queries, mutations } from '../graphql';
import { collectOrders } from '../utils';

class PipelineContainer extends React.Component {
  constructor(props) {
    super(props);

    this.toggleConfig = this.toggleConfig.bind(this);

    const { stages } = props;

    this.state = { stages: [...stages] };
  }

  toggleConfig(value) {
    const { pipeline } = this.props;

    const storagePipeline =
      JSON.parse(localStorage.getItem(STORAGE_PIPELINE_KEY)) || {};
    storagePipeline[pipeline._id] = value;

    localStorage.setItem(STORAGE_PIPELINE_KEY, JSON.stringify(storagePipeline));
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.state !== nextProps.state) {
      const {
        state: { type, index, itemId },
        pipeline,
        stagesUpdateOrderMutation,
        stagesChangeMutation
      } = nextProps;

      const { stages } = this.state;

      if (type === 'removeItem') {
        // Remove from list
        stages.splice(index, 1);
      }

      if (type === 'addItem') {
        // Add to list
        stages.splice(index, 0, { _id: itemId });

        // if move to other pipeline, will change pipelineId
        stagesChangeMutation({
          variables: { _id: itemId, pipelineId: pipeline._id }
        }).catch(error => {
          Alert.error(error.message);
        });
      }

      const orders = collectOrders(stages);

      stagesUpdateOrderMutation({
        variables: { orders }
      }).catch(error => {
        Alert.error(error.message);
      });

      this.setState({ stages });
    }
  }

  render() {
    const extendedProps = {
      ...this.props,
      stages: this.state.stages,
      toggleConfig: this.toggleConfig
    };

    return <Pipeline {...extendedProps} />;
  }
}

PipelineContainer.propTypes = {
  pipeline: PropTypes.object,
  state: PropTypes.object,
  stages: PropTypes.array,
  stagesUpdateOrder: PropTypes.func,
  stagesChange: PropTypes.func,
  stagesUpdateOrderMutation: PropTypes.func,
  stagesChangeMutation: PropTypes.func
};

const PipelineContainerWithData = compose(
  graphql(gql(mutations.stagesUpdateOrder), {
    name: 'stagesUpdateOrderMutation'
  }),
  graphql(gql(mutations.stagesChange), {
    name: 'stagesChangeMutation'
  })
)(PipelineContainer);

class StagesWithPipeline extends React.Component {
  render() {
    const { stagesQuery } = this.props;

    if (stagesQuery.loading) {
      return <Spinner />;
    }

    const stages = stagesQuery.dealStages;

    const extendedProps = {
      ...this.props,
      stages
    };

    return <PipelineContainerWithData {...extendedProps} />;
  }
}

StagesWithPipeline.propTypes = {
  stagesQuery: PropTypes.object
};

export default compose(
  graphql(gql(queries.stages), {
    name: 'stagesQuery',
    options: ({ pipeline }) => ({
      variables: {
        pipelineId: pipeline._id
      }
    })
  })
)(StagesWithPipeline);
